import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocFromServer
} from "firebase/firestore";
import { getDatabase, ref, set, push, get, onValue } from "firebase/database";
import firebaseConfig from "./firebase-applet-config.json";
import { EmergencyContact, AccidentLog, LocationHistory, SensorData } from "./types";

// Firebase App Initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Database Connections
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);

// ---------------------------------------------------------------------------
// CONNECTION DIAGNOSTIC MANDATE
// ---------------------------------------------------------------------------
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase integration connected successfully to Cloud Firestore.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client is currently offline. Checks will retry once connection re-establishes.");
    } else {
      console.warn("Diagnostic connection check status: ", error);
    }
  }
}
// Note: testConnection is preserved for manual debugger references but is no longer executed automatically on initial load to avoid premature warning loops.


// ---------------------------------------------------------------------------
// ERROR HANDLING INTERFACES & ENUMS
// ---------------------------------------------------------------------------
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Discovered: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// 1. EMERGENCY CONTACTS SERVICES
// ---------------------------------------------------------------------------
const CONTACTS_COL = "emergencyContacts";

/**
 * Adds an emergency contact to the database.
 */
export async function addContact(contact: Omit<EmergencyContact, "createdAt">): Promise<void> {
  const collectionPath = CONTACTS_COL;
  try {
    const contactId = contact.contactId || "contact-" + Date.now();
    const newContact: EmergencyContact = {
      ...contact,
      contactId,
      createdAt: new Date().toISOString()
    };
    // Save to Firestore
    await setDoc(doc(db, collectionPath, contactId), newContact);

    // Save synchronously to Realtime Database to ensure dual-realtime IoT telemetry sync works!
    try {
      const rtdbRef = ref(rtdb, `${CONTACTS_COL}/${contact.userId}/${contactId}`);
      await set(rtdbRef, newContact);
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (Contacts):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionPath);
  }
}

/**
 * Updates an existing emergency contact in the database.
 */
export async function updateContact(contactId: string, updates: Partial<EmergencyContact> & { userId: string }): Promise<void> {
  const collectionPath = CONTACTS_COL;
  try {
    const contactRef = doc(db, collectionPath, contactId);
    await updateDoc(contactRef, updates as any);

    // Update synchronously in Realtime Database as well
    try {
      const rtdbRef = ref(rtdb, `${CONTACTS_COL}/${updates.userId}/${contactId}`);
      await set(rtdbRef, {
        ...(await get(rtdbRef)).val(),
        ...updates
      });
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (Contact Update):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${collectionPath}/${contactId}`);
  }
}

/**
 * Deletes an emergency contact.
 */
export async function deleteContact(contactId: string, userId: string): Promise<void> {
  const collectionPath = CONTACTS_COL;
  try {
    await deleteDoc(doc(db, collectionPath, contactId));

    // Delete from Realtime Database synchronously
    try {
      const rtdbRef = ref(rtdb, `${CONTACTS_COL}/${userId}/${contactId}`);
      await set(rtdbRef, null);
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (Contact Delete):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${contactId}`);
  }
}

/**
 * Fetches all emergency contacts filtered by specific rider/user.
 */
export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  const collectionPath = CONTACTS_COL;
  try {
    const q = query(collection(db, collectionPath), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const contacts: EmergencyContact[] = [];
    snapshot.forEach((doc) => {
      contacts.push(doc.data() as EmergencyContact);
    });
    return contacts;
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, collectionPath);
  }
}

// ---------------------------------------------------------------------------
// 2. GPS TRACKING/GEOLOCATION TELEMETRY SERVICES
// ---------------------------------------------------------------------------
const GPS_COL = "gpsHistory";

/**
 * Persists periodic vehicle positioning and telemetry marks.
 */
export async function saveLocation(userId: string, lat: number, lng: number, speed: number): Promise<void> {
  const collectionPath = GPS_COL;
  try {
    const freshLoc: LocationHistory = {
      userId,
      lat,
      lng,
      speed,
      timestamp: new Date().toISOString()
    };
    // Add to Firestore collection history path
    await addDoc(collection(db, collectionPath), freshLoc);

    // Save to RTDB location state for active real-time maps
    try {
      const rtdbRef = ref(rtdb, `gpsHistory/${userId}`);
      await set(rtdbRef, {
        ...freshLoc,
        active: true
      });
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (GPS Link):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionPath);
  }
}

/**
 * Gets location tracking log path history for user.
 */
export async function getLocationHistory(userId: string): Promise<LocationHistory[]> {
  const collectionPath = GPS_COL;
  try {
    const q = query(
      collection(db, collectionPath),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const history: LocationHistory[] = [];
    snapshot.forEach((doc) => {
      history.push(doc.data() as LocationHistory);
    });
    return history.reverse(); // Standard chronologically sorted history
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, collectionPath);
  }
}

// ---------------------------------------------------------------------------
// 3. ACCIDENTS & ROAD COLLISION DETECTIONS
// ---------------------------------------------------------------------------
const ACCIDENTS_COL = "accidentLogs";

/**
 * Saves a new accident incident into history arrays.
 */
export async function saveAccident(accident: Omit<AccidentLog, "timestamp">): Promise<void> {
  const collectionPath = ACCIDENTS_COL;
  try {
    const accidentId = accident.accidentId || "acc-" + Date.now();
    const completeLog: AccidentLog = {
      ...accident,
      accidentId,
      timestamp: new Date().toISOString()
    };

    await setDoc(doc(db, collectionPath, accidentId), completeLog);

    // Put to IoT RTDB
    try {
      const rtdbRef = ref(rtdb, `accidentLogs/${accident.userId}/${accidentId}`);
      await set(rtdbRef, completeLog);
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (Accidents):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionPath);
  }
}

/**
 * Retrieves list of previous rider crashes.
 */
export async function getAccidents(userId: string): Promise<AccidentLog[]> {
  const collectionPath = ACCIDENTS_COL;
  try {
    const q = query(
      collection(db, collectionPath),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    const results: AccidentLog[] = [];
    snapshot.forEach(doc => {
      results.push(doc.data() as AccidentLog);
    });
    return results;
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, collectionPath);
  }
}

// ---------------------------------------------------------------------------
// 4. SMART SENSOR DATA SNAPSHOTS
// ---------------------------------------------------------------------------
const SENSORS_COL = "sensorData";

/**
 * Saves instant helmet telemetry metrics to historical list.
 */
export async function saveSensorData(sensorData: Omit<SensorData, "timestamp">): Promise<void> {
  const collectionPath = SENSORS_COL;
  try {
    const completeSensor: SensorData = {
      ...sensorData,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, collectionPath), completeSensor);

    // Save to RTDB live telemetry
    try {
      const rtdbRef = ref(rtdb, `liveSensorData/${sensorData.userId}`);
      await set(rtdbRef, completeSensor);
    } catch (rtdbErr) {
      console.warn("Realtime Database sync warning (Sensors):", rtdbErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionPath);
  }
}

/**
 * Gets historical sensor snapshots.
 */
export async function getSensorData(userId: string): Promise<SensorData[]> {
  const collectionPath = SENSORS_COL;
  try {
    const q = query(
      collection(db, collectionPath),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const results: SensorData[] = [];
    snapshot.forEach(doc => {
      results.push(doc.data() as SensorData);
    });
    return results;
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, collectionPath);
  }
}

/**
 * Writes a diagnostic document to collection "test" to verify Firestore sync.
 */
export async function writeTestConnection(): Promise<string> {
  const collectionPath = "test";
  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      message: "RideGuard Connected",
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    // If standard error handles or falls back, we throw here to bubble back to the test interface
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 5. REAL ESP32 HARDWARE REALTIME DATABASE SYNC
// ---------------------------------------------------------------------------
export interface HelmetData {
  helmetWorn: boolean;
  alcoholLevel: number;
  speed: number;
  latitude: number;
  longitude: number;
  crashDetected: boolean;
  sosPressed: boolean;
  timestamp: string;
}

/**
 * Attaches a real-time listener to the helmetData node inside Firebase Realtime Database.
 */
export function subscribeToHelmetData(callback: (data: HelmetData | null) => void): () => void {
  const helmetRef = ref(rtdb, "helmetData");
  const unsubscribe = onValue(helmetRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as HelmetData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("RTDB Realtime Helmet Snapshot Error:", error);
  });
  return unsubscribe;
}

/**
 * Updates properties on the helmetData node in Realtime Database.
 */
export async function updateHelmetData(data: Partial<HelmetData>): Promise<void> {
  const helmetRef = ref(rtdb, "helmetData");
  try {
    const existingSnap = await get(helmetRef);
    const current = existingSnap.exists() ? existingSnap.val() : {};
    
    const fieldsToSet = {
      helmetWorn: data.helmetWorn !== undefined ? data.helmetWorn : (current.helmetWorn !== undefined ? current.helmetWorn : true),
      alcoholLevel: data.alcoholLevel !== undefined ? data.alcoholLevel : (current.alcoholLevel !== undefined ? current.alcoholLevel : 145),
      speed: data.speed !== undefined ? data.speed : (current.speed !== undefined ? current.speed : 40),
      latitude: data.latitude !== undefined ? data.latitude : (current.latitude !== undefined ? current.latitude : 37.779213),
      longitude: data.longitude !== undefined ? data.longitude : (current.longitude !== undefined ? current.longitude : -122.411124),
      crashDetected: data.crashDetected !== undefined ? data.crashDetected : (current.crashDetected !== undefined ? current.crashDetected : false),
      sosPressed: data.sosPressed !== undefined ? data.sosPressed : (current.sosPressed !== undefined ? current.sosPressed : false),
      timestamp: new Date().toISOString()
    };
    
    await set(helmetRef, fieldsToSet);
  } catch (err) {
    console.error("Failed to commit updates to helmetData node:", err);
    throw err;
  }
}

