export interface User {
  userId: string;
  email: string;
  name: string;
  bloodGroup: string;
  bikeModel: string;
  deviceId: string;
  createdAt: string;
}

export interface EmergencyContact {
  contactId: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  createdAt: string;
}

export interface SensorData {
  userId: string;
  worn: boolean;
  alcoholLevel: number;
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
}

export interface AccidentLog {
  accidentId: string;
  userId: string;
  lat: number;
  lng: number;
  severityPrediction: string;
  riskScore: number;
  status: string;
  contactsNotified: string;
  factors: string[];
  timestamp: string;
}

export interface LocationHistory {
  userId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type: "helmet_not_worn" | "alcohol_detected" | "accident_detected" | "sos_triggered" | "device_disconnected" | "low_battery" | "info";
  message: string;
  read: boolean;
  timestamp: string;
}

export interface SOSLog {
  sosId: string;
  userId: string;
  lat: number;
  lng: number;
  status: string;
  timestamp: string;
}

export interface AlertHistory {
  alertId: string;
  accidentId?: string;
  sosId?: string;
  message: string;
  recipients: string[];
  timestamp: string;
}

export interface DashboardPayload {
  user: User;
  sensorData: SensorData;
  accidentLogs: AccidentLog[];
  locationHistory: LocationHistory[];
  notifications: Notification[];
  sosLogs: SOSLog[];
  contacts: EmergencyContact[];
  alertHistory: AlertHistory[];
}

export interface AIAnalysisResult {
  severityPrediction: string;
  riskScore: number;
  unsafeDrivingDetected: boolean;
  factors: string[];
  alertPrioritization: string;
  responseSuggestions: string;
}
