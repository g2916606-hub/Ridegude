import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import HomeView from "./components/HomeView";
import FeaturesView from "./components/FeaturesView";
import DashboardView from "./components/DashboardView";
import AnalyticsView from "./components/AnalyticsView";
import EmergencyContactsView from "./components/EmergencyContactsView";
import LiveMapView from "./components/LiveMapView";
import AdminPanelView from "./components/AdminPanelView";
import EmergencyAlertModal from "./components/EmergencyAlertModal";
import HardwareIntegrationView from "./components/HardwareIntegrationView";
import { DashboardPayload } from "./types";
import { subscribeToHelmetData } from "./firebase";

const DEFAULT_PAYLOAD: DashboardPayload = {
  user: {
    userId: "user-1",
    email: "g2916606@gmail.com",
    name: "Alex Vance",
    bloodGroup: "O-Positive",
    bikeModel: "Yamaha MT-07 (700cc)",
    deviceId: "ESP32-RG-772",
    createdAt: new Date().toISOString()
  },
  sensorData: {
    userId: "user-1",
    worn: true,
    alcoholLevel: 145,
    speed: 40,
    battery: 88,
    accelX: 0.0,
    accelY: 0.0,
    accelZ: 1.0,
    gyroX: 0.0,
    gyroY: 0.0,
    gyroZ: 0.0,
    deviceOnline: true,
    timestamp: new Date().toISOString()
  },
  accidentLogs: [],
  locationHistory: [],
  notifications: [],
  sosLogs: [],
  contacts: [],
  alertHistory: []
};

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [payload, setPayload] = useState<DashboardPayload>(DEFAULT_PAYLOAD);
  const [loading, setLoading] = useState(true);

  // Sync state loop with server API
  const fetchState = async () => {
    try {
      const resp = await fetch("/api/dashboard");
      if (resp.ok) {
        const data = await resp.json();
        setPayload(data);
      }
    } catch (e) {
      console.warn("Express server connection offline, operating in mock standalone context:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // Poll the backend less aggressively since telemetry is now fully realtime via Firebase
    const timer = setInterval(fetchState, 6000);
    return () => clearInterval(timer);
  }, []);

  // Listen to live, real-time ESP32 hardware telemetry over Firebase Realtime Database
  useEffect(() => {
    const unsubscribe = subscribeToHelmetData((data) => {
      if (data) {
        setPayload((prev) => {
          const lastUpdateTime = new Date(data.timestamp).getTime();
          // Connected if updated recently (within last 35 seconds)
          const isConnected = !isNaN(lastUpdateTime) && (Date.now() - lastUpdateTime < 35000);

          // Build dynamic GPS tracking breadcrumbs from realtime coordinates
          let updatedHistory = [...prev.locationHistory];
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            const lastHistoryPoint = updatedHistory[updatedHistory.length - 1];
            const isNewPoint = !lastHistoryPoint ||
              Math.abs(lastHistoryPoint.lat - data.latitude) > 0.00001 ||
              Math.abs(lastHistoryPoint.lng - data.longitude) > 0.00001;

            if (isNewPoint) {
              updatedHistory.push({
                userId: "user-1",
                lat: data.latitude,
                lng: data.longitude,
                speed: data.speed,
                timestamp: data.timestamp
              });
              if (updatedHistory.length > 50) {
                updatedHistory.shift();
              }
            } else if (lastHistoryPoint) {
              lastHistoryPoint.speed = data.speed;
              lastHistoryPoint.timestamp = data.timestamp;
            }
          }

          // Trigger automatic Crash Detection status if flagged by the ESP32
          let updatedAccidents = [...prev.accidentLogs];
          if (data.crashDetected) {
            const hasActivePending = updatedAccidents.some(acc => acc.status === "Pending" || acc.status === "Unresolved");
            if (!hasActivePending) {
              const newAccident = {
                accidentId: "acc-rtdb-" + Date.now(),
                userId: "user-1",
                lat: data.latitude || 37.779213,
                lng: data.longitude || -122.411124,
                severityPrediction: "High",
                riskScore: 95,
                status: "Pending",
                contactsNotified: prev.contacts.map(c => c.name).join(", ") || "Emergency Dispatchers",
                factors: ["Deceleration collision G force registered", "Real ESP32 board collision signal"],
                timestamp: data.timestamp
              };
              updatedAccidents.unshift(newAccident);
            }
          }

          // Trigger active distress beacon if SOS pressed on ESP32
          let updatedSos = [...prev.sosLogs];
          if (data.sosPressed) {
            const hasActiveSos = updatedSos.some(s => s.status === "Active");
            if (!hasActiveSos) {
              updatedSos.unshift({
                sosId: "sos-rtdb-" + Date.now(),
                userId: "user-1",
                lat: data.latitude || 37.779213,
                lng: data.longitude || -122.411124,
                status: "Active",
                timestamp: data.timestamp
              });
            }
          }

          return {
            ...prev,
            sensorData: {
              ...prev.sensorData,
              worn: data.helmetWorn,
              alcoholLevel: data.alcoholLevel,
              speed: data.speed,
              deviceOnline: isConnected,
              timestamp: data.timestamp
            },
            locationHistory: updatedHistory,
            accidentLogs: updatedAccidents,
            sosLogs: updatedSos
          };
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleClearNotifications = async () => {
    try {
      await fetch("/api/notifications/clear", { method: "POST" });
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAccidentStatus = async (accidentId: string, status: string) => {
    try {
      const resp = await fetch("/api/accident/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accidentId, status })
      });
      if (resp.ok) {
        fetchState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // View routing switcher
  const renderView = () => {
    switch (currentPage) {
      case "home":
        return <HomeView onNavigate={setCurrentPage} sensorData={payload.sensorData} />;
      case "features":
        return <FeaturesView />;
      case "dashboard":
        return (
          <DashboardView 
            payload={payload} 
            onRefresh={fetchState} 
            onUpdateAccidentStatus={handleUpdateAccidentStatus} 
          />
        );
      case "contacts":
        return (
          <EmergencyContactsView 
            contacts={payload.contacts} 
            accidentLogs={payload.accidentLogs}
            onUpdateAccidentStatus={handleUpdateAccidentStatus}
            onRefresh={fetchState} 
            sosLogs={payload.sosLogs}
            sensorData={payload.sensorData}
          />
        );
      case "analytics":
        return <AnalyticsView onNavigate={setCurrentPage} />;
      case "map":
        return <LiveMapView payload={payload} />;
      case "admin":
        return (
          <AdminPanelView 
            payload={payload} 
            onUpdateAccidentStatus={handleUpdateAccidentStatus} 
          />
        );
      case "hardware":
        return <HardwareIntegrationView />;
      default:
        return <HomeView onNavigate={setCurrentPage} sensorData={payload.sensorData} />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-gray-400 font-mono text-sm">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="animate-pulse">BOOTING RIDEGUARD+ SAFETY MATRIX FEED...</p>
        </div>
      </div>
    );
  }

  const pendingAccident = payload.accidentLogs.find(acc => acc.status === "Pending");

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-gray-200">
      {/* Dynamic Header Navbar */}
      <Navbar 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        notifications={payload.notifications}
        onClearNotifications={handleClearNotifications}
        online={payload.sensorData.deviceOnline}
        battery={payload.sensorData.battery}
      />

      {/* Primary Page Canvas Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>

      {/* Global Emergency Countdown Alert Popup Modal */}
      {pendingAccident && (
        <EmergencyAlertModal
          accident={pendingAccident}
          contacts={payload.contacts}
          onIsSafe={() => handleUpdateAccidentStatus(pendingAccident.accidentId, "Safe")}
          onSendHelp={() => handleUpdateAccidentStatus(pendingAccident.accidentId, "Help Sent")}
        />
      )}
    </div>
  );
}

