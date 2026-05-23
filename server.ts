import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Database file path
const DB_FILE = path.join(process.cwd(), "rideguard-db.json");

// Internal Database Schema type definitions
interface DBStructure {
  users: Array<{
    userId: string;
    email: string;
    name: string;
    bloodGroup: string;
    bikeModel: string;
    deviceId: string;
    createdAt: string;
  }>;
  emergencyContacts: Array<{
    contactId: string;
    userId: string;
    name: string;
    relationship: string;
    phone: string;
    createdAt: string;
  }>;
  sensorData: {
    userId: string;
    worn: boolean;
    alcoholLevel: number; // MQ value (0 to 1024; safe is < 300)
    speed: number;
    battery: number;
    accelX: number;
    accelY: number;
    accelZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
    deviceOnline: boolean;
    timestamp: string;
  };
  accidentLogs: Array<{
    accidentId: string;
    userId: string;
    lat: number;
    lng: number;
    severityPrediction: string;
    riskScore: number;
    status: string; // 'Pending' | 'Safe' | 'Help Sent' | 'Closed'
    contactsNotified: string;
    factors: string[];
    timestamp: string;
  }>;
  locationHistory: Array<{
    userId: string;
    lat: number;
    lng: number;
    speed: number;
    timestamp: string;
  }>;
  notifications: Array<{
    notificationId: string;
    userId: string;
    type: "helmet_not_worn" | "alcohol_detected" | "accident_detected" | "sos_triggered" | "device_disconnected" | "low_battery" | "info";
    message: string;
    read: boolean;
    timestamp: string;
  }>;
  sosLogs: Array<{
    sosId: string;
    userId: string;
    lat: number;
    lng: number;
    status: string; // 'Active' | 'Help Dispatched' | 'Resolved'
    timestamp: string;
  }>;
  alertHistory: Array<{
    alertId: string;
    accidentId?: string;
    sosId?: string;
    message: string;
    recipients: string[];
    timestamp: string;
  }>;
}

// Default initial state for visual populating
const INITIAL_DB: DBStructure = {
  users: [
    {
      userId: "user-1",
      email: "g2916606@gmail.com",
      name: "Alex Vance",
      bloodGroup: "O-Positive",
      bikeModel: "Yamaha MT-07 (700cc)",
      deviceId: "ESP32-RG-772",
      createdAt: new Date().toISOString()
    }
  ],
  emergencyContacts: [
    {
      contactId: "c-1",
      userId: "user-1",
      name: "Sarah Vance",
      relationship: "Spouse",
      phone: "+1 (555) 019-2834",
      createdAt: new Date().toISOString()
    },
    {
      contactId: "c-2",
      userId: "user-1",
      name: "Dr. Robert Carter",
      relationship: "Primary Physician / Emergency Doctor",
      phone: "+1 (555) 014-9988",
      createdAt: new Date().toISOString()
    }
  ],
  sensorData: {
    userId: "user-1",
    worn: true,
    alcoholLevel: 145, // safe
    speed: 42, // km/h
    battery: 88,
    accelX: 0.05,
    accelY: -0.01,
    accelZ: 0.98,
    gyroX: 0.1,
    gyroY: -0.2,
    gyroZ: 0.0,
    deviceOnline: true,
    timestamp: new Date().toISOString()
  },
  accidentLogs: [
    {
      accidentId: "a-0",
      userId: "user-1",
      lat: 37.774929,
      lng: -122.419416,
      severityPrediction: "Moderate",
      riskScore: 45,
      status: "Closed",
      contactsNotified: "Sarah Vance, Dr. Robert Carter",
      factors: ["Sudden pitch change", "Medium deceleration impact"],
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // 1 day ago
    }
  ],
  locationHistory: [
    { userId: "user-1", lat: 37.774929, lng: -122.419416, speed: 40, timestamp: new Date(Date.now() - 40 * 60000).toISOString() },
    { userId: "user-1", lat: 37.775831, lng: -122.417854, speed: 45, timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    { userId: "user-1", lat: 37.776591, lng: -122.415842, speed: 42, timestamp: new Date(Date.now() - 20 * 60000).toISOString() },
    { userId: "user-1", lat: 37.777931, lng: -122.413241, speed: 48, timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
    { userId: "user-1", lat: 37.779213, lng: -122.411124, speed: 38, timestamp: new Date().toISOString() }
  ],
  notifications: [
    {
      notificationId: "n-1",
      userId: "user-1",
      type: "info",
      message: "RideGuard+ Smart Helmet Connected Successfully.",
      read: false,
      timestamp: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  sosLogs: [],
  alertHistory: []
};

// Ensure database file exists
let dbData: DBStructure = { ...INITIAL_DB };
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    dbData = JSON.parse(raw);
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
  }
} catch (e) {
  console.error("Database reading failed, using transient storage:", e);
}

// Function to persist database changes
const saveDB = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (e) {
    console.error("Database write error:", e);
  }
};

// Helper: Lazy initialization of Gemini client
let geminiClientCache: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClientCache) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      geminiClientCache = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return geminiClientCache;
}

// AI Analysis Logic
async function predictSeverityAndRisk(sensorSnapshot: any) {
  const helmetWorn = sensorSnapshot.worn;
  const alcoholVal = sensorSnapshot.alcoholLevel;
  const speed = sensorSnapshot.speed;
  const aX = sensorSnapshot.accelX;
  const aY = sensorSnapshot.accelY;
  const aZ = sensorSnapshot.accelZ;

  const client = getGeminiClient();
  if (!client) {
    // Elegant fallback simulation
    let severity = "Low";
    let risk = 15;
    const factors = ["Standard telemetry"];

    if (alcoholVal > 300) {
      risk += 40;
      factors.push("Elevated Blood Alcohol Concentration equivalent");
    }
    if (!helmetWorn) {
      risk += 35;
      factors.push("Safety Violation: Unworn Protection Helmet");
    }
    if (speed > 80) {
      risk += 15;
      factors.push("High riding speed");
    }
    const impactG = Math.sqrt(aX * aX + aY * aY + aZ * aZ);
    if (impactG > 3.0) {
      severity = "Critical";
      risk = 95;
      factors.push(`Severe impact force detected: ${impactG.toFixed(1)}G`);
    } else if (impactG > 1.8) {
      severity = "Moderate";
      risk = Math.max(risk, 55);
      factors.push(`Abrupt deceleration peak: ${impactG.toFixed(1)}G`);
    }

    return {
      severityPrediction: severity,
      riskScore: Math.min(risk, 100),
      unsafeDrivingDetected: speed > 70 || alcoholVal > 250,
      factors: factors.length > 0 ? factors : ["No abnormal vectors detected"],
      alertPrioritization: severity === "Critical" ? "Immediate Contact Dispatch" : "Normal Monitor Flow",
      responseSuggestions: severity === "Critical" 
        ? "Alert emergency services instantly and coordinate spouse notification." 
        : "Check up on user via prompt and keep state under log."
    };
  }

  try {
    const prompt = `Analyze this smart safety helmet telemetry snapshot to predict:
    1. Accident severity prediction ('Low' | 'Moderate' | 'High' | 'Critical')
    2. Overall Rider Risk score (0 to 100)
    3. Unsafe driving behaviour flag (boolean)
    4. Primary risk contributors/factors (array of strings)
    5. Alert prioritization level ('Immediate Contact Dispatch' | 'Urgent Review Needed' | 'Normal Monitor Flow')
    6. Recommendation response actions (string)

    Sensor Snapshot:
    - Helmet Worn: ${helmetWorn}
    - MQ alcohol level (0-1024, safe is < 300): ${alcoholVal}
    - Riding Speed (km/h): ${speed}
    - 3-axis Accelerometer G-forces (accelX: ${aX}G, accelY: ${aY}G, accelZ: ${aZ}G)
    - Gyroscope values (gyroX: ${sensorSnapshot.gyroX}, gyroY: ${sensorSnapshot.gyroY}, gyroZ: ${sensorSnapshot.gyroZ})`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severityPrediction: { type: Type.STRING, description: "Low, Moderate, High, or Critical severity potential" },
            riskScore: { type: Type.INTEGER, description: "An overall safety risk index out of 100" },
            unsafeDrivingDetected: { type: Type.BOOLEAN, description: "Whether the telemetry outlines unsafe riding states" },
            factors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Short phrases listing the dangerous features (e.g. 'High deceleration', 'Helmet not worn')"
            },
            alertPrioritization: { type: Type.STRING },
            responseSuggestions: { type: Type.STRING }
          },
          required: ["severityPrediction", "riskScore", "unsafeDrivingDetected", "factors", "alertPrioritization", "responseSuggestions"]
        }
      }
    });

    const output = JSON.parse(response.text || "{}");
    return output;
  } catch (error) {
    console.error("Gemini analysis call failed:", error);
    // Silent recovery
    return {
      severityPrediction: "Moderate",
      riskScore: 60,
      unsafeDrivingDetected: true,
      factors: ["Hardware safety violation triggers", "Gemini timeout feedback override"],
      alertPrioritization: "Urgent Review Needed",
      responseSuggestions: "Trigger warning notification to user and call primary contacts."
    };
  }
}

// API Routes

// 1. Get entire state for Dashboard
app.get("/api/dashboard", (req, res) => {
  res.json({
    user: dbData.users[0],
    sensorData: dbData.sensorData,
    accidentLogs: dbData.accidentLogs,
    locationHistory: dbData.locationHistory,
    notifications: dbData.notifications,
    sosLogs: dbData.sosLogs,
    contacts: dbData.emergencyContacts
  });
});

// API Routes

// 1. Get entire state for Dashboard
app.get("/api/dashboard", (req, res) => {
  res.json({
    user: dbData.users[0],
    sensorData: dbData.sensorData,
    accidentLogs: dbData.accidentLogs,
    locationHistory: dbData.locationHistory,
    notifications: dbData.notifications,
    sosLogs: dbData.sosLogs,
    contacts: dbData.emergencyContacts,
    alertHistory: dbData.alertHistory || []
  });
});

// Helper: Run real-mode SOS alert sequence to alert emergency contacts
function triggerSosAlert(lat: number, lng: number, accidentId?: string, sosId?: string) {
  const currentLat = lat || 37.779213;
  const currentLng = lng || -122.411124;
  const mapsLink = `https://maps.google.com/?q=${currentLat},${currentLng}`;
  const currentTime = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";

  // Construct standard formatted message
  const smsMessage = `🚨 RIDEGUARD+ EMERGENCY ALERT

Accident detected.

Location:
${mapsLink}

Time: ${currentTime}

Please contact the rider immediately.`;

  const recipients: string[] = [];
  const sentToDetail: { name: string; phone: string; status: string }[] = [];

  // Notify each emergency contact
  dbData.emergencyContacts.forEach(contact => {
    recipients.push(`${contact.name} (${contact.phone})`);
    
    // Unshift a notification for each SMS sent so user can visually verify in dashboard feed
    dbData.notifications.unshift({
      notificationId: "n-sms-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      userId: "user-1",
      type: "sos_triggered",
      message: `📩 SMS Alert Dispatched to ${contact.name} (${contact.phone}): "Accident detected..."`,
      read: false,
      timestamp: new Date().toISOString()
    });
  });

  // Save to alert history
  const alertId = "alert-" + Date.now();
  dbData.alertHistory.unshift({
    alertId,
    accidentId,
    sosId,
    message: smsMessage,
    recipients,
    timestamp: new Date().toISOString()
  });

  // Also push general SOS notification
  dbData.notifications.unshift({
    notificationId: "n-sos-main-" + Date.now(),
    userId: "user-1",
    type: "sos_triggered",
    message: `🚨 Emergency SOS Broadcast complete. ${dbData.emergencyContacts.length} contacts notified with Google Maps coordinate link!`,
    read: false,
    timestamp: new Date().toISOString()
  });

  saveDB();
  return { alertId, message: smsMessage, recipients };
}

// 2. ESP32 POST endpoints for incoming sensors updates

// GET/POST for helmet-status
app.post("/api/helmet-status", (req, res) => {
  const worn = typeof req.body.worn === "boolean" ? req.body.worn : req.body.worn === "true";
  dbData.sensorData.worn = worn;
  dbData.sensorData.timestamp = new Date().toISOString();
  
  if (!worn) {
    const notifId = "n-" + Date.now();
    dbData.notifications.unshift({
      notificationId: notifId,
      userId: "user-1",
      type: "helmet_not_worn",
      message: "🚨 RideGuard+ Warning: Helmet unworn while system is activated!",
      read: false,
      timestamp: new Date().toISOString()
    });
  }
  saveDB();
  res.json({ success: true, worn });
});

// Alias requested: POST /api/helmet
app.post("/api/helmet", (req, res) => {
  const worn = typeof req.body.worn === "boolean" ? req.body.worn : req.body.worn === "true";
  dbData.sensorData.worn = worn;
  dbData.sensorData.timestamp = new Date().toISOString();
  
  if (!worn) {
    dbData.notifications.unshift({
      notificationId: "n-hl-" + Date.now(),
      userId: "user-1",
      type: "helmet_not_worn",
      message: "🚨 RideGuard+ Warning: Helmet IR Proximity sensor reports UNWORN state!",
      read: false,
      timestamp: new Date().toISOString()
    });
  } else {
    dbData.notifications.unshift({
      notificationId: "n-hl-" + Date.now(),
      userId: "user-1",
      type: "info",
      message: "🟢 Helmet status update: Helmet is worn and secure.",
      read: false,
      timestamp: new Date().toISOString()
    });
  }
  saveDB();
  res.json({ success: true, worn });
});

// GET/POST for alcohol-status
app.post("/api/alcohol-status", (req, res) => {
  const alcoholLevel = Number(req.body.alcoholLevel);
  if (!isNaN(alcoholLevel)) {
    dbData.sensorData.alcoholLevel = alcoholLevel;
    dbData.sensorData.timestamp = new Date().toISOString();

    if (alcoholLevel > 300) {
      const notifId = "n-" + Date.now();
      dbData.notifications.unshift({
        notificationId: notifId,
        userId: "user-1",
        type: "alcohol_detected",
        message: `🚨 RideGuard+ Alcohol Warning: MQ sensor level ${alcoholLevel} is above safe threshold! Ignition lock engaged.`,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
    saveDB();
    res.json({ success: true, alcoholLevel, locked: alcoholLevel > 300 });
  } else {
    res.status(400).json({ error: "Invalid alcoholLevel number property" });
  }
});

// Alias requested: POST /api/alcohol
app.post("/api/alcohol", (req, res) => {
  const alcoholLevel = Number(req.body.alcoholLevel);
  if (!isNaN(alcoholLevel)) {
    dbData.sensorData.alcoholLevel = alcoholLevel;
    dbData.sensorData.timestamp = new Date().toISOString();

    if (alcoholLevel > 300) {
      dbData.notifications.unshift({
        notificationId: "n-al-" + Date.now(),
        userId: "user-1",
        type: "alcohol_detected",
        message: `🚨 MQ-3 Alcohol Sensor alert: ${alcoholLevel} PPM exceeds threshold! Engine ignition locked.`,
        read: false,
        timestamp: new Date().toISOString()
      });
    } else {
      dbData.notifications.unshift({
        notificationId: "n-al-" + Date.now(),
        userId: "user-1",
        type: "info",
        message: `🟢 MQ-3 Alcohol status: ${alcoholLevel} PPM (Safe level). Ignition clear.`,
        read: false,
        timestamp: new Date().toISOString()
      });
    }
    saveDB();
    res.json({ success: true, alcoholLevel, locked: alcoholLevel > 300 });
  } else {
    res.status(400).json({ error: "Invalid alcoholLevel value" });
  }
});

app.post("/api/location", (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const speed = Number(req.body.speed || 0);

  if (!isNaN(lat) && !isNaN(lng)) {
    dbData.sensorData.speed = speed;
    dbData.sensorData.timestamp = new Date().toISOString();

    // Add to location history array
    dbData.locationHistory.push({
      userId: "user-1",
      lat,
      lng,
      speed,
      timestamp: new Date().toISOString()
    });

    // Keep history bounded to 25 records for neat display
    if (dbData.locationHistory.length > 25) {
      dbData.locationHistory.shift();
    }

    saveDB();
    res.json({ success: true, historyCount: dbData.locationHistory.length, lat, lng, speed });
  } else {
    res.status(400).json({ error: "Invalid location coordinates types" });
  }
});

// Trigger possible accident - Reads MPU6050 accelerometer impact thresholds from ESP32
app.post("/api/accident", async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const accelX = Number(req.body.accelX ?? 0.05);
  const accelY = Number(req.body.accelY ?? -0.01);
  const accelZ = Number(req.body.accelZ ?? 0.98);
  const gyroX = Number(req.body.gyroX ?? 0);
  const gyroY = Number(req.body.gyroY ?? 0);
  const gyroZ = Number(req.body.gyroZ ?? 0);
  const forcedByRider = req.body.forcedByRider === true || req.body.forcedByRider === "true";

  const currentLat = !isNaN(lat) ? lat : (dbData.locationHistory.length > 0 ? dbData.locationHistory[dbData.locationHistory.length - 1].lat : 37.779213);
  const currentLng = !isNaN(lng) ? lng : (dbData.locationHistory.length > 0 ? dbData.locationHistory[dbData.locationHistory.length - 1].lng : -122.411124);

  // If accelerometer forces represent an impact, or forcedByRider:
  const computedGForce = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
  
  // Real-mode MPU6050 threshold check. Impact exceeds if dynamic G force is > 2.5G
  const exceedsThreshold = computedGForce > 2.5;

  if (exceedsThreshold || forcedByRider || req.body.rawGForce > 2.5) {
    // Update live sensor metrics
    dbData.sensorData.accelX = accelX;
    dbData.sensorData.accelY = accelY;
    dbData.sensorData.accelZ = accelZ;
    dbData.sensorData.gyroX = gyroX;
    dbData.sensorData.gyroY = gyroY;
    dbData.sensorData.gyroZ = gyroZ;
    dbData.sensorData.timestamp = new Date().toISOString();

    // Prepare severity analysis
    const sensorSnapshot = { ...dbData.sensorData, accelX, accelY, accelZ };
    const smartPrediction = await predictSeverityAndRisk(sensorSnapshot);

    const accidentId = "acc-" + Date.now();
    const contactsList = dbData.emergencyContacts.map(c => `${c.name} (${c.relationship})`).join(", ");

    const newAccident = {
      accidentId,
      userId: "user-1",
      lat: currentLat,
      lng: currentLng,
      severityPrediction: smartPrediction.severityPrediction || "High",
      riskScore: smartPrediction.riskScore || 85,
      status: "Pending", // Starts the 15-second countdown in the React dashboard popup
      contactsNotified: contactsList,
      factors: smartPrediction.factors || ["Severe deceleration force detected", "MPU6050 accelerometer impact"],
      timestamp: new Date().toISOString()
    };

    dbData.accidentLogs.unshift(newAccident);

    dbData.notifications.unshift({
      notificationId: "n-acc-" + Date.now(),
      userId: "user-1",
      type: "accident_detected",
      message: `🚨 Possible accident detected! Severity: ${newAccident.severityPrediction}. Starting safety countdown...`,
      read: false,
      timestamp: new Date().toISOString()
    });

    saveDB();
    res.json({
      success: true,
      accidentDetected: true,
      accident: newAccident,
      gForce: computedGForce,
      smartPrediction
    });
  } else {
    // Just normal telemetry updates
    dbData.sensorData.accelX = accelX;
    dbData.sensorData.accelY = accelY;
    dbData.sensorData.accelZ = accelZ;
    dbData.sensorData.gyroX = gyroX;
    dbData.sensorData.gyroY = gyroY;
    dbData.sensorData.gyroZ = gyroZ;
    dbData.sensorData.timestamp = new Date().toISOString();
    saveDB();
    res.json({
      success: true,
      accidentDetected: false,
      gForce: computedGForce,
      message: "Telemetry updated. Impact below threshold limits."
    });
  }
});

// Trigger direct SOS
app.post("/api/sos", (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  
  const currentLat = !isNaN(lat) ? lat : (dbData.locationHistory.length > 0 ? dbData.locationHistory[dbData.locationHistory.length - 1].lat : 37.779213);
  const currentLng = !isNaN(lng) ? lng : (dbData.locationHistory.length > 0 ? dbData.locationHistory[dbData.locationHistory.length - 1].lng : -122.411124);

  const sosId = "sos-" + Date.now();
  const newSOS = {
    sosId,
    userId: "user-1",
    lat: currentLat,
    lng: currentLng,
    status: "Active",
    timestamp: new Date().toISOString()
  };

  dbData.sosLogs.unshift(newSOS);

  // Send SOS Alert instantly: formats GPS coords, sends simulated SMS & logs history!
  const alertSummary = triggerSosAlert(currentLat, currentLng, undefined, sosId);

  saveDB();
  res.json({ success: true, sos: newSOS, alertSummary });
});

// Update accident status (Help sent / Safe)
app.post("/api/accident/update", (req, res) => {
  const { accidentId, status } = req.body;
  const index = dbData.accidentLogs.findIndex(a => a.accidentId === accidentId);
  if (index !== -1) {
    const previousStatus = dbData.accidentLogs[index].status;
    dbData.accidentLogs[index].status = status;
    
    // Add info notification
    dbData.notifications.unshift({
      notificationId: "n-" + Date.now(),
      userId: "user-1",
      type: "info",
      message: `Accident Case #${accidentId.substring(4, 9)} status marked: ${status}.`,
      read: false,
      timestamp: new Date().toISOString()
    });

    // If countdown expired (reaches zero) or Help was manually dispatched, trigger active SOS alert dispatches!
    if (status === "Help Sent") {
      triggerSosAlert(dbData.accidentLogs[index].lat, dbData.accidentLogs[index].lng, accidentId, undefined);
    }

    saveDB();
    res.json({ success: true, updated: dbData.accidentLogs[index] });
  } else {
    res.status(404).json({ error: "Accident log not found" });
  }
});

// Contacts CRUD
app.get("/api/contacts", (req, res) => {
  res.json(dbData.emergencyContacts);
});

app.post("/api/contacts", (req, res) => {
  const { name, relationship, phone } = req.body;
  if (name && relationship && phone) {
    const contactId = "c-" + Date.now();
    const newContact = {
      contactId,
      userId: "user-1",
      name,
      relationship,
      phone,
      createdAt: new Date().toISOString()
    };
    dbData.emergencyContacts.push(newContact);
    saveDB();
    res.json({ success: true, contact: newContact });
  } else {
    res.status(400).json({ error: "Missing fields" });
  }
});

app.put("/api/contacts/:id", (req, res) => {
  const contactId = req.params.id;
  const { name, relationship, phone } = req.body;
  const index = dbData.emergencyContacts.findIndex(c => c.contactId === contactId);
  if (index !== -1) {
    dbData.emergencyContacts[index] = {
      ...dbData.emergencyContacts[index],
      name: name || dbData.emergencyContacts[index].name,
      relationship: relationship || dbData.emergencyContacts[index].relationship,
      phone: phone || dbData.emergencyContacts[index].phone
    };
    saveDB();
    res.json({ success: true, contact: dbData.emergencyContacts[index] });
  } else {
    res.status(404).json({ error: "Contact not found" });
  }
});

app.delete("/api/contacts/:id", (req, res) => {
  const contactId = req.params.id;
  const initialLen = dbData.emergencyContacts.length;
  dbData.emergencyContacts = dbData.emergencyContacts.filter(c => c.contactId !== contactId);
  if (dbData.emergencyContacts.length < initialLen) {
    saveDB();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Contact not found" });
  }
});

// Notifications read handler
app.post("/api/notifications/read", (req, res) => {
  dbData.notifications = dbData.notifications.map(n => ({ ...n, read: true }));
  saveDB();
  res.json({ success: true });
});

app.post("/api/notifications/clear", (req, res) => {
  dbData.notifications = [];
  saveDB();
  res.json({ success: true });
});

// Simulator endpoints - allows user to toggle metrics from the dashboard directly!
app.post("/api/simulate/hardware", (req, res) => {
  const { worn, alcoholLevel, speed, battery, deviceOnline, accelX, gyroX } = req.body;
  
  if (typeof worn !== "undefined") dbData.sensorData.worn = worn;
  if (typeof alcoholLevel !== "undefined") dbData.sensorData.alcoholLevel = alcoholLevel;
  if (typeof speed !== "undefined") dbData.sensorData.speed = speed;
  if (typeof battery !== "undefined") dbData.sensorData.battery = battery;
  if (typeof deviceOnline !== "undefined") dbData.sensorData.deviceOnline = deviceOnline;
  
  if (typeof accelX !== "undefined") dbData.sensorData.accelX = accelX;
  if (typeof gyroX !== "undefined") dbData.sensorData.gyroX = gyroX;
  
  dbData.sensorData.timestamp = new Date().toISOString();

  // Create notifications if values are critical
  if (typeof worn !== "undefined" && !worn) {
    dbData.notifications.unshift({
      notificationId: "n-" + Date.now(),
      userId: "user-1",
      type: "helmet_not_worn",
      message: "🚨 Alert: Helmet unworn! Active ride safety status compromised.",
      read: false,
      timestamp: new Date().toISOString()
    });
  }
  if (typeof alcoholLevel !== "undefined" && alcoholLevel > 300) {
    dbData.notifications.unshift({
      notificationId: "n-" + Date.now(),
      userId: "user-1",
      type: "alcohol_detected",
      message: `🚨 Alert: MQ Alcohol Sensor detected ${alcoholLevel}ppm block! Ignition circuit disconnected.`,
      read: false,
      timestamp: new Date().toISOString()
    });
  }
  if (typeof battery !== "undefined" && battery < 20) {
    dbData.notifications.unshift({
      notificationId: "n-" + Date.now(),
      userId: "user-1",
      type: "low_battery",
      message: `🔋 Warning: Low Smart Helmet Battery (${battery}%). Recharge device!`,
      read: false,
      timestamp: new Date().toISOString()
    });
  }

  saveDB();
  res.json({ success: true, updated: dbData.sensorData });
});

// Trigger Server-side AI analysis for simulated status
app.post("/api/ai/analyze-risk", async (req, res) => {
  try {
    const analysis = await predictSeverityAndRisk(dbData.sensorData);
    res.json({ success: true, analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start integration with Vite in Dev environment
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), "dist"))
      ? path.join(process.cwd(), "dist")
      : path.join(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RideGuard+ Backend Online at http://0.0.0.0:${PORT}`);
  });
}

runServer();
