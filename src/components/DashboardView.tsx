import React, { useState, useEffect } from "react";
import { 
  Shield, Flame, Compass, Gauge, AlertTriangle, Battery, 
  Cpu, Zap, RefreshCw, Sparkles, AlertOctagon, HeartHandshake,
  Radio, Signal, Wifi, MapPin, Navigation, Info, Clock, Activity, Loader, CheckCircle2, XCircle, Phone, ArrowUpRight
} from "lucide-react";
import { DashboardPayload, AIAnalysisResult, SOSLog } from "../types";
import { writeTestConnection, updateHelmetData } from "../firebase";

interface DashboardViewProps {
  payload: DashboardPayload;
  onRefresh: () => void;
  onUpdateAccidentStatus: (accidentId: string, status: string) => void;
}

export default function DashboardView({ payload, onRefresh, onUpdateAccidentStatus }: DashboardViewProps) {
  const { sensorData, accidentLogs, sosLogs, contacts, alertHistory } = payload;
  
  // Simulation states synced with live telemetry data
  const [simWorn, setSimWorn] = useState(sensorData.worn);
  const [simAlcohol, setSimAlcohol] = useState(sensorData.alcoholLevel);
  const [simSpeed, setSimSpeed] = useState(sensorData.speed);
  const [simBattery, setSimBattery] = useState(sensorData.battery);
  const [simOnline, setSimOnline] = useState(sensorData.deviceOnline);
  
  // Real-time IMU G-Force coordinates
  const [simAccelX, setSimAccelX] = useState(sensorData.accelX || 0.05);
  const [simAccelY, setSimAccelY] = useState(sensorData.accelY || -0.01);
  const [simAccelZ, setSimAccelZ] = useState(sensorData.accelZ || 0.98);

  const [isSimulating, setIsSimulating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [sosLoading, setSosLoading] = useState(false);

  // Firebase connection testing states
  const [fbTesting, setFbTesting] = useState(false);
  const [fbResult, setFbResult] = useState<{ success: boolean; docId?: string; error?: string } | null>(null);

  // Live timeline feeds for SVG graphs (holds last 15 ticks)
  const [history, setHistory] = useState<any[]>([]);
  const [chartTab, setChartTab] = useState<"speed-gforce" | "alcohol-battery">("speed-gforce");

  // Fire-up diagnostic Firebase test
  const handleTestFirebase = async () => {
    setFbTesting(true);
    setFbResult(null);
    try {
      const docId = await writeTestConnection();
      setFbResult({ success: true, docId });
    } catch (err: any) {
      console.error("Firebase Test Error:", err);
      let errMsg = "An unknown error occurred during transaction";
      try {
        const parsed = JSON.parse(err.message);
        errMsg = parsed.error || errMsg;
      } catch {
        errMsg = err.message || errMsg;
      }
      setFbResult({ success: false, error: errMsg });
    } finally {
      setFbTesting(false);
    }
  };

  // Sync controls state if sensorData parent ticks
  useEffect(() => {
    setSimWorn(sensorData.worn);
    setSimAlcohol(sensorData.alcoholLevel);
    setSimSpeed(sensorData.speed);
    setSimBattery(sensorData.battery);
    setSimOnline(sensorData.deviceOnline);
    setSimAccelX(sensorData.accelX || 0.05);
    setSimAccelY(sensorData.accelY || -0.01);
    setSimAccelZ(sensorData.accelZ || 0.98);
  }, [sensorData]);

  // Push historical logs for dynamic SVG charts drawing
  useEffect(() => {
    const now = Date.now();
    // Warm-up historical timeline
    if (history.length === 0) {
      const initial = Array.from({ length: 15 }).map((_, i) => {
        const offset = (15 - i) * 3000;
        return {
          time: new Date(now - offset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speed: Math.max(0, sensorData.speed - Math.round(Math.random() * 8) + 4),
          alcohol: Math.max(50, sensorData.alcoholLevel - Math.round(Math.random() * 20) + 10),
          gforce: Math.max(0.8, 1.0 + (Math.random() * 0.15 - 0.05)),
          battery: Math.min(100, Math.max(10, sensorData.battery))
        };
      });
      setHistory(initial);
    } else {
      // Append newest real-time sensor ticks
      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speed: sensorData.speed,
          alcohol: sensorData.alcoholLevel,
          gforce: Math.sqrt(
            sensorData.accelX * sensorData.accelX + 
            sensorData.accelY * sensorData.accelY + 
            sensorData.accelZ * sensorData.accelZ
          ),
          battery: sensorData.battery
        };
        const updated = [...prev, newPoint];
        if (updated.length > 20) {
          updated.shift();
        }
        return updated;
      });
    }
  }, [sensorData]);

  // Handle hardware telemetry simulation submission
  const handleSimulateUpdate = async (updates: any) => {
    setIsSimulating(true);
    try {
      const rtdbUpdates: any = {};
      if (updates.worn !== undefined) rtdbUpdates.helmetWorn = updates.worn;
      if (updates.alcoholLevel !== undefined) rtdbUpdates.alcoholLevel = updates.alcoholLevel;
      if (updates.speed !== undefined) rtdbUpdates.speed = updates.speed;
      if (updates.crashDetected !== undefined) rtdbUpdates.crashDetected = updates.crashDetected;
      if (updates.sosPressed !== undefined) rtdbUpdates.sosPressed = updates.sosPressed;
      if (updates.battery !== undefined) rtdbUpdates.battery = updates.battery;

      const lastLoc = payload.locationHistory[payload.locationHistory.length - 1];
      rtdbUpdates.latitude = lastLoc ? lastLoc.lat : 37.779213;
      rtdbUpdates.longitude = lastLoc ? lastLoc.lng : -122.411124;

      await updateHelmetData(rtdbUpdates);

      const resp = await fetch("/api/simulate/hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (resp.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("Simulation to Firebase Sync failed:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Trigger real-time SOS distress call
  const handleTriggerSOS = async () => {
    setSosLoading(true);
    try {
      const currentLat = payload.locationHistory.length > 0 ? payload.locationHistory[payload.locationHistory.length - 1].lat : 37.779213;
      const currentLng = payload.locationHistory.length > 0 ? payload.locationHistory[payload.locationHistory.length - 1].lng : -122.411124;

      await updateHelmetData({ sosPressed: true, latitude: currentLat, longitude: currentLng });

      const resp = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: currentLat, lng: currentLng })
      });
      if (resp.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("SOS Trigger Error:", e);
    } finally {
      setSosLoading(false);
    }
  };

  // Run server AI risk analyzer on current telemetry
  const handleAiRiskAnalyze = async () => {
    setAiLoading(true);
    try {
      const resp = await fetch("/api/ai/analyze-risk", {
        method: "POST"
      });
      if (resp.ok) {
        const data = await resp.json();
        setAiResult(data.analysis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Critical checks
  const isAlcoholUnsafe = sensorData.alcoholLevel > 300;
  const isHelmetNotWorn = !sensorData.worn;
  const isBatteryLow = sensorData.battery < 20;
  const isSpeedHigh = sensorData.speed > 60;

  // Compute live vector acceleration
  const liveGForceForce = Math.sqrt(
    sensorData.accelX * sensorData.accelX + 
    sensorData.accelY * sensorData.accelY + 
    sensorData.accelZ * sensorData.accelZ
  );

  // Active distress records
  const activeSOS = sosLogs.find(sos => sos.status === "Active");
  const pendingAccident = accidentLogs.find(acc => acc.status === "Pending");

  // Dynamic Safety Rating formula for the academic presentation
  let safetyScore = 100;
  if (!sensorData.worn) safetyScore -= 35;
  if (sensorData.alcoholLevel > 300) safetyScore -= 40;
  if (sensorData.speed > 60) safetyScore -= 15;
  if (pendingAccident) safetyScore -= 50;
  safetyScore = Math.max(0, safetyScore);

  // Helper function to build professional SVG paths dynamically for charts
  const generateChartPaths = (vals: number[], width: number, height: number, min: number, max: number) => {
    if (vals.length < 2) return { line: "", area: "" };
    const range = max - min || 1;
    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const clampedVal = Math.min(max, Math.max(min, v));
      const y = height - ((clampedVal - min) / range) * height;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
    return { line, area };
  };

  // Extract separate history tracks
  const speedHistory = history.map(h => h.speed);
  const gforceHistory = history.map(h => h.gforce);
  const alcoholHistory = history.map(h => h.alcohol);
  const batteryHistory = history.map(h => h.battery);

  // Compile paths for SVG
  const width = 600;
  const height = 140;

  const speedPaths = generateChartPaths(speedHistory, width, height, 0, 120);
  const gforcePaths = generateChartPaths(gforceHistory, width, height, 0.5, 4.0);
  const alcoholPaths = generateChartPaths(alcoholHistory, width, height, 0, 800);
  const batteryPaths = generateChartPaths(batteryHistory, width, height, 0, 100);

  return (
    <div className="space-y-8 py-2 animate-fade-in text-slate-100">
      
      {/* DEVICE SUMMARY SUBHEADER PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 text-left relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Active Safety Telemetry Feed</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${sensorData.deviceOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/35' : 'bg-rose-950 text-rose-400 border border-rose-500/35'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sensorData.deviceOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              {sensorData.deviceOnline ? "ESP32 Connected" : "ESP32 Offline"}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1 font-sans">
            Secure Node: <span className="text-blue-400 font-mono font-bold">{payload.user.deviceId}</span> ({payload.user.name}) | Vehicle: <span className="text-slate-300 font-bold">{payload.user.bikeModel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Diagnostic Firebase Connection Test Button */}
          <button
            id="test-firebase-btn"
            onClick={handleTestFirebase}
            disabled={fbTesting}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border cursor-pointer ${
              fbTesting
                ? "bg-slate-800 border-slate-700 text-slate-400 animate-pulse cursor-not-allowed"
                : "bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/55 shadow-sm shadow-indigo-950/30"
            }`}
          >
            {fbTesting ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Testing Firebase...
              </>
            ) : (
              <>
                <Radio className="h-3.5 w-3.5 text-indigo-400" />
                Firebase Connection Test
              </>
            )}
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 hover:bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Synchronize Feeds
          </button>
        </div>
      </div>

      {/* FIREBASE CONNECTION TEST STATUS FEEDBACK */}
      {fbResult && (
        <div className={`p-5 rounded-2xl border text-left space-y-2.5 transition-all animate-fade-in ${
          fbResult.success
            ? "bg-indigo-950/30 border-indigo-500/30 text-indigo-250"
            : "bg-rose-950/20 border-rose-500/30 text-rose-250"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${fbResult.success ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <h4 className="font-extrabold text-sm tracking-wider font-mono">
                {fbResult.success ? "✅ Firebase Connected" : "❌ Firebase Error"}
              </h4>
            </div>
            <button
              onClick={() => setFbResult(null)}
              className="text-[10px] uppercase font-bold text-slate-450 hover:text-white font-mono bg-slate-950/50 border border-slate-800/40 px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs leading-relaxed font-sans mt-1">
            {fbResult.success ? (
              <>
                🎉 Success! Handshake established. A new doc has been written safely to Firestore collection <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 font-mono text-[10px] font-bold">"test"</code>.
                <div className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-indigo-950/40 space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Document ID:</span>
                    <span className="text-white font-bold">{fbResult.docId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Saved Message:</span>
                    <span className="text-emerald-400 font-medium">"RideGuard Connected"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-400">{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                ⚠️ Write check transaction rejected: <span className="text-red-300 font-mono font-medium">{fbResult.error}</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* RIDER CRITICAL FAILS ALERTS AND COMPLIANCE HEADLINE STRIP */}
      {(isHelmetNotWorn || isAlcoholUnsafe) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-amber-950/30 border border-red-500/40 text-left space-y-2 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500/70" />
          <div className="flex items-center gap-2 text-rose-450">
            <AlertOctagon className="h-5 w-5 animate-pulse text-red-500" />
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-red-400">Ride Clearance Violation Detected</h4>
          </div>
          <p className="text-xs text-rose-200 font-sans pl-1">
            {isHelmetNotWorn && "⚠️ SAFETY WARNING: IR proximity module registers UNWORN state. Helmet must be securely locked before riding. "}
            {isAlcoholUnsafe && `⚠️ SOBRIETY BREACH: MQ alcohol level equivalent (${sensorData.alcoholLevel} PPM) exceeds safety limit. Bike motor spark starter disabled.`}
          </p>
        </div>
      )}

      {/* BENCHMARK GRID: 7 ENHANCED REAL-TIME TELEMETRY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 text-left">
        
        {/* 1. Helmet Status Card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          isHelmetNotWorn 
            ? 'bg-rose-950/15 border-rose-500/40 shadow-lg shadow-rose-950/10' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Helmet wear status</span>
            <div className={`p-2 rounded-xl ${isHelmetNotWorn ? 'bg-rose-950/70 text-rose-400 animate-pulse' : 'bg-emerald-950/70 text-emerald-400'}`}>
              <Shield className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black tracking-tight ${isHelmetNotWorn ? 'text-rose-400' : 'text-emerald-400'}`}>
              {sensorData.worn ? "Worn & Secure" : "Unworn Violation"}
            </div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-850 flex items-center justify-between">
              <span>IR Proximity Sensor:</span>
              <span className={`font-mono font-bold ${sensorData.worn ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                {sensorData.worn ? "DETECTED" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Alcohol detection card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          isAlcoholUnsafe 
            ? 'bg-amber-950/20 border-amber-500/45 shadow-lg shadow-amber-900/15' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Alcohol detection</span>
            <div className={`p-2 rounded-xl ${isAlcoholUnsafe ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-slate-950 text-emerald-400'}`}>
              <Flame className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black tracking-tight ${isAlcoholUnsafe ? 'text-amber-450 animate-pulse' : 'text-emerald-400'}`}>
              {sensorData.alcoholLevel} <span className="text-xs text-slate-500 font-normal">PPM</span>
            </div>
            
            {/* Visual limits progress bar */}
            <div className="w-full bg-slate-950/70 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-300 ${isAlcoholUnsafe ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, (sensorData.alcoholLevel / 850) * 100)}%` }}
              />
            </div>
            
            <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-850 flex items-center justify-between">
              <span>Starter Relay lock:</span>
              <span className={`font-mono font-bold ${isAlcoholUnsafe ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isAlcoholUnsafe ? "LOCKED OUT" : "CLEARED"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Rider speed card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          isSpeedHigh 
            ? 'bg-amber-950/15 border-amber-500/40 shadow-sm' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Rider Speed</span>
            <div className={`p-2 rounded-xl ${isSpeedHigh ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-slate-950 text-cyan-400'}`}>
              <Gauge className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black tracking-tight ${isSpeedHigh ? 'text-amber-400' : 'text-slate-100'}`}>
              {sensorData.speed} <span className="text-xs text-slate-500 font-normal">km/h</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-850 flex items-center justify-between">
              <span>Threshold Guard:</span>
              <span className={`font-mono font-bold ${isSpeedHigh ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                {isSpeedHigh ? "OVERLIMIT 60+" : "UNDER LIMIT"}
              </span>
            </div>
          </div>
        </div>

        {/* 4. GPS Coordinates Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md hover:border-slate-700/60 transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">GPS Location Lock</span>
            <div className="p-2 rounded-xl bg-slate-950 text-blue-400">
              <Compass className="h-4.5 w-4.5 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="text-sm font-mono font-extrabold text-slate-200">
              {payload.locationHistory.length > 0 
                ? `${payload.locationHistory[payload.locationHistory.length - 1].lat.toFixed(6)}, ${payload.locationHistory[payload.locationHistory.length - 1].lng.toFixed(6)}` 
                : "37.779213, -122.411124"}
            </div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-850 flex items-center justify-between font-mono">
              <span>Sat lock status:</span>
              <span className="text-blue-400 font-bold">12 Active (HDOP: 0.9)</span>
            </div>
          </div>
        </div>

        {/* 5. Real-time accident detection card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          pendingAccident 
            ? 'bg-rose-950/25 border-red-500 shadow-xl shadow-red-950/15 animate-pulse' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Accident detection</span>
            <div className={`p-2 rounded-xl ${pendingAccident ? 'bg-red-950 text-red-500 animate-bounce' : 'bg-slate-950 text-emerald-400'}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black uppercase tracking-tight ${pendingAccident ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {pendingAccident ? "🚨 COLLISION!" : "Active Standby"}
            </div>
            <div className="text-[11px] text-slate-450 pt-2 border-t border-slate-850 flex items-center justify-between font-mono">
              <span>Dynamic G-Force:</span>
              <span className={`font-bold ${pendingAccident ? 'text-rose-400' : 'text-slate-300'}`}>
                {liveGForceForce.toFixed(2)} G
              </span>
            </div>
          </div>
        </div>

        {/* 6. SOS emergency alert card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          activeSOS 
            ? 'bg-rose-950/35 border-red-500 shadow-lg shadow-red-950/15 animate-pulse' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">SOS Status</span>
            <div className={`p-2 rounded-xl ${activeSOS ? 'bg-red-950 text-red-400 animate-ping' : 'bg-slate-950 text-emerald-400'}`}>
              <Radio className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black tracking-tight ${activeSOS ? 'text-red-400 font-black' : 'text-emerald-400'}`}>
              {activeSOS ? "SOS Broadcast!" : "SOS Guard Ready"}
            </div>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-850 flex items-center justify-between">
              <span>Override dispatch:</span>
              <span className={`font-mono font-bold ${activeSOS ? 'text-red-400' : 'text-slate-400'}`}>
                {activeSOS ? "Active" : "Standby"}
              </span>
            </p>
          </div>
        </div>

        {/* 7. Battery percentage card */}
        <div className={`rounded-3xl border p-5 backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${
          isBatteryLow 
            ? 'bg-rose-950/20 border-rose-500/40' 
            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Battery remaining</span>
            <div className={`p-2 rounded-xl bg-slate-950 ${isBatteryLow ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`}>
              <Battery className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className={`text-2xl font-black tracking-tight ${isBatteryLow ? 'text-rose-450' : 'text-slate-100'}`}>
              {sensorData.battery}%
            </div>
            
            <div className="w-full bg-slate-950/70 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-300 ${isBatteryLow ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${sensorData.battery}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-850 flex items-center justify-between">
              <span>Run hours left:</span>
              <span className="font-mono text-emerald-400 font-bold">{Math.round(sensorData.battery * 0.15)} hrs</span>
            </div>
          </div>
        </div>

        {/* 8. Safety Score Analytics Summary */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Safe Drive Index</span>
            <div className="p-2 rounded-xl bg-slate-950 text-indigo-400">
              <Cpu className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-1">
              <span>{safetyScore}</span><span className="text-[11px] text-slate-500 font-normal">/ 100</span>
            </div>
            <div className="text-[11px] pt-2 border-t border-slate-850 flex items-center justify-between font-sans">
              <span>Starter Relay State:</span>
              <span className={`font-bold font-mono ${isAlcoholUnsafe ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isAlcoholUnsafe ? "LOCKED" : "ACTIVE"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* MID SECTION: DYNAMIC CHART AREA + SIMULATED INTERACTIVE CONTROLLERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ESP32 HARDWARE CONTROLLERS CLUSTER PANEL - SIMULATOR FOR COLLEGE DEMO */}
        <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-6 text-left backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
              ESP32 Sensor Cluster Panel
            </h3>
            <p className="text-xs text-slate-400">
              College Demo Controls: Drag the sliders to feed real-time hardware telemetry variations and test instant alert dispatches.
            </p>
          </div>

          <div className="space-y-4 my-4 flex-1">
            
            {/* Quick status checkboxes */}
            <div className="grid grid-cols-2 gap-3">
              {/* Force Helmet toggle */}
              <button
                onClick={() => {
                  const val = !simWorn;
                  setSimWorn(val);
                  handleSimulateUpdate({ worn: val });
                }}
                className={`flex flex-col p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  simWorn ? 'bg-emerald-950/25 text-emerald-400 border-emerald-500/10' : 'bg-rose-950/25 text-rose-400 border-rose-500/15'
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-slate-500 font-bold">Helmet IR State</span>
                <span className="text-xs font-semibold mt-0.5">{simWorn ? "Worn OK" : "Unworn"}</span>
              </button>

              {/* Force Device Connectivity */}
              <button
                onClick={() => {
                  const val = !simOnline;
                  setSimOnline(val);
                  handleSimulateUpdate({ deviceOnline: val });
                }}
                className={`flex flex-col p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  simOnline ? 'bg-emerald-950/25 text-emerald-400 border-emerald-500/10' : 'bg-rose-950/25 text-rose-400 border-rose-500/15'
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-slate-500 font-bold">WiFi Transmitter</span>
                <span className="text-xs font-semibold mt-0.5">{simOnline ? "Online Link" : "Offline Link"}</span>
              </button>
            </div>

            {/* MQ-3 Alcohol Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Alcohol Concentration Level</span>
                <span className={`font-mono text-xs font-bold ${simAlcohol > 300 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {simAlcohol} PPM
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="850"
                value={simAlcohol}
                onChange={(e) => setSimAlcohol(parseInt(e.target.value))}
                onMouseUp={() => handleSimulateUpdate({ alcoholLevel: simAlcohol })}
                onTouchEnd={() => handleSimulateUpdate({ alcoholLevel: simAlcohol })}
                className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>Safe Limits (&lt; 300)</span>
                <span className="text-amber-500 font-bold">Relay Cutoff Thr</span>
              </div>
            </div>

            {/* Velocity Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Rider Velocity Speed</span>
                <span className="font-mono text-slate-300 font-bold">{simSpeed} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="125"
                value={simSpeed}
                onChange={(e) => setSimSpeed(parseInt(e.target.value))}
                onMouseUp={() => handleSimulateUpdate({ speed: simSpeed })}
                onTouchEnd={() => handleSimulateUpdate({ speed: simSpeed })}
                className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0 km/h</span>
                <span>Speeding Warning (&gt;60)</span>
              </div>
            </div>

            {/* Battery Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Helmet Li-Po Battery Charge</span>
                <span className="font-mono text-slate-300 font-bold">{simBattery}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={simBattery}
                onChange={(e) => setSimBattery(parseInt(e.target.value))}
                onMouseUp={() => handleSimulateUpdate({ battery: simBattery })}
                onTouchEnd={() => handleSimulateUpdate({ battery: simBattery })}
                className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* MPU6050 Accelerometer simulation */}
            <div className="space-y-3 border-t border-slate-950/40 pt-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block">MPU6050 Accelerometers (Gs)</span>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>accel_X (Impact axis):</span>
                  <span>{simAccelX.toFixed(2)} G</span>
                </div>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  value={Math.round(simAccelX * 100)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) / 100;
                    setSimAccelX(val);
                  }}
                  onMouseUp={() => handleSimulateUpdate({ accelX: simAccelX })}
                  onTouchEnd={() => handleSimulateUpdate({ accelX: simAccelX })}
                  className="w-full h-1 bg-slate-950 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

          </div>

          {/* Action Trigger Buttons */}
          <div className="grid grid-cols-1 gap-2.5 pt-3 border-t border-slate-950/40 mt-auto">
            <button
              onClick={async () => {
                setIsSimulating(true);
                try {
                  const resp = await fetch("/api/accident", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      lat: 37.779213,
                      lng: -122.411124,
                      rawGForce: 3.8
                    })
                  });
                  if (resp.ok) {
                    onRefresh();
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsSimulating(false);
                }
              }}
              disabled={isSimulating}
              className="w-full bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-650 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="h-4 w-4 animate-bounce" />
              Trigger Crash Force Surge
            </button>

            <button
              onClick={handleTriggerSOS}
              disabled={sosLoading}
              className="w-full bg-slate-950 hover:bg-slate-900 text-rose-400 hover:text-rose-350 font-bold text-xs py-3 rounded-xl border border-rose-500/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              {sosLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4 shrink-0" />}
              Trigger SOS Guardian Beacon
            </button>
          </div>
        </div>

        {/* COMPREHENSIVE CHARTS & EMERGENCY PANEL GROUP */}
        <div className="lg:col-span-8 space-y-6 text-left">
          
          {/* Active Accident Alert Box when Pending */}
          {pendingAccident && (
            <div className="bg-rose-950/30 border-2 border-red-500 p-6 rounded-3xl space-y-4 shadow-2xl animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-red-600 font-mono text-[9px] text-white font-extrabold uppercase rounded-bl-xl tracking-wider animate-pulse">
                IMPACT CRITICAL LEVEL DETECTED
              </div>
              <div className="flex gap-4 items-start pb-2">
                <div className="bg-red-500/20 text-red-400 p-3 rounded-2xl border border-red-500/30 shrink-0">
                  <AlertOctagon className="h-7 w-7 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-lg">CRASH DISPATCH CYCLE ACTIVATED</h3>
                  <p className="text-slate-300 text-xs">
                    MPU6050 collision sensor registered a high deceleration rate. Press "I Am Safe" below within the 15-second grace period, or emergency dispatches go out to configured contacts.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-900">
                <div className="space-y-0.5">
                  <div className="text-rose-450 text-xs font-mono font-bold uppercase tracking-wider">CELLULAR INTERCONNECT SMS ROUTE</div>
                  <div className="text-[11px] text-slate-400">
                    Target contacts: <span className="text-slate-200 font-bold font-mono">{pendingAccident.contactsNotified || "None configured"}</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => onUpdateAccidentStatus(pendingAccident.accidentId, "Safe")}
                    className="flex-1 sm:flex-none flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    I Am Safe
                  </button>
                  <button
                    onClick={() => onUpdateAccidentStatus(pendingAccident.accidentId, "Help Sent")}
                    className="flex-1 sm:flex-none flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md animate-pulse"
                  >
                    Dispatch Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REAL-TIME CHARTS AND HISTORIC TIMELINE VISUALIZER */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 backdrop-blur-md relative">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="font-bold text-white text-base">Real-Time Sensor Waveforms</h4>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Continuous telemetry logs plotted on real-time SVG timelines.</p>
              </div>
              
              {/* Plot selectors */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 self-start">
                <button
                  onClick={() => setChartTab("speed-gforce")}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                    chartTab === "speed-gforce" ? "bg-blue-650 text-white shadow-md font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Speed & G-Force
                </button>
                <button
                  onClick={() => setChartTab("alcohol-battery")}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                    chartTab === "alcohol-battery" ? "bg-blue-650 text-white shadow-md font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Alcohol & Battery
                </button>
              </div>
            </div>

            {/* Drawing beautiful Custom responsive SVG line graphs */}
            <div className="relative bg-slate-950 rounded-2xl border border-slate-900 p-4 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:20px_20px]" />
              
              {history.length > 1 ? (
                <div className="space-y-4">
                  <div className="h-[140px] w-full relative">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {chartTab === "speed-gforce" ? (
                        <>
                          {/* Speed Fill and Line */}
                          <defs>
                            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          <path d={speedPaths.area} fill="url(#speedGrad)" />
                          <path d={speedPaths.line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                          {/* G-Force Overlap */}
                          <path d={gforcePaths.area} fill="url(#gGrad)" opacity="0.6" />
                          <path d={gforcePaths.line} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <defs>
                            <linearGradient id="alcGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="batGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          <path d={alcoholPaths.area} fill="url(#alcGrad)" />
                          <path d={alcoholPaths.line} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />

                          <path d={batteryPaths.area} fill="url(#batGrad)" />
                          <path d={batteryPaths.line} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Legends & labels */}
                  <div className="flex flex-wrap items-center justify-between gap-4 text-[10.5px] font-mono border-t border-slate-900 pt-2 text-slate-500">
                    <div className="flex gap-4">
                      {chartTab === "speed-gforce" ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            <b className="text-blue-400">Rider Velocity (0-120 km/h)</b>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded bg-emerald-500 shrink-0" />
                            <b className="text-emerald-400">Accelerometer Peak Impact (0.5-4 G)</b>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <b className="text-amber-500">Alcohol concentration (0-800 PPM)</b>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded bg-cyan-500 shrink-0" />
                            <b className="text-cyan-400">Li-Po charger depletion (0-100%)</b>
                          </span>
                        </>
                      )}
                    </div>
                    <span>Last updated: {sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : "Live tracking"}</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-600 italic">
                  Calibrating waveform telemetry lines...
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* EMERGENCY CONTACT INFORMATION PANEL (Added so observers instantly see configured guardians) */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-slate-950 pb-2.5">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <HeartHandshake className="h-4.5 w-4.5 text-rose-450 text-red-400 animate-pulse" />
                    Emergency SMS Guardians
                  </h4>
                  <p className="text-[11px] text-slate-550 text-slate-500">SMS broadcasts will stream to these phone routes instantly.</p>
                </div>
                <span className="text-[9px] font-mono tracking-widest text-emerald-400 border border-emerald-500/25 bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase font-bold">
                  Active
                </span>
              </div>

              {contacts && contacts.length > 0 ? (
                <div className="space-y-2.5">
                  {contacts.map((c) => (
                    <div key={c.contactId} className="bg-slate-950/80 border border-slate-900 p-3 rounded-2xl transition hover:border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                          {c.name}
                          <span className="text-[10px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded-md text-slate-400 font-mono font-medium">
                            {c.relationship}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                          {c.phone}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/20 py-1 px-2.5 rounded-xl border border-emerald-500/10">
                          <CheckCircle2 className="h-3 w-3" /> Enabled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl p-4 text-center text-slate-500 italic space-y-2">
                  <span className="text-xs">No Emergency Contacts Registered Yet.</span>
                  <p className="text-[10px] text-slate-550 text-slate-600 max-w-xs norm">
                    Populate emergency contacts directory securely in the "Guardians" section first to automatically trigger the GPS SMS dispatches.
                  </p>
                </div>
              )}
            </div>

            {/* SATELLITE RADAR GPS COMPASS MAP PATH */}
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4 backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-slate-950 pb-2.5">
                <div>
                  <h4 className="font-bold text-white text-sm">GPS Breadcrumbs Feed</h4>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">Live routing logs extracted from NEO-6M device locks.</p>
                </div>
                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-lg text-slate-400 font-mono font-bold">
                  SIG: 100% OK
                </span>
              </div>

              <div className="relative h-32 w-full rounded-2xl bg-slate-950 border border-slate-900 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:16px_16px]" />
                
                <svg className="absolute inset-0 w-full h-full text-blue-500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M 10 90 L 35 60 L 55 75 L 75 30 L 90 40" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" />
                  <path d="M 10 90 L 35 60 L 55 75 L 75 30 L 90 40" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="2 2" />
                  <circle cx="90" cy="40" r="10" fill="#10b981" fillOpacity="0.1" className="animate-ping" />
                  <circle cx="90" cy="40" r="4.5" fill="#10b981" />
                </svg>

                <div className="absolute bottom-2.5 inset-x-2.5 bg-slate-900/95 border border-slate-850 p-2 rounded-xl flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-300 font-bold flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> sf financial district coordinate grid</span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">LOCK VERIFIED</span>
                </div>
              </div>
            </div>

          </div>

          {/* EMERGENCY CELLULAR SMS DISPATCH HISTORY FEED */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 backdrop-blur-md">
            <div className="flex justify-between items-center border-b border-slate-950 pb-3">
              <div>
                <h4 className="font-bold text-white text-base">Emergency SMS Dispatch Outbox</h4>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Live Cellular Gateway: Real outbox message transmissions synced.</p>
              </div>
              <span className="text-[10px] bg-red-950 px-2.5 py-1 rounded-lg text-red-500 font-mono font-bold">
                TRANSCEIVER: ONLINE
              </span>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
              {alertHistory && alertHistory.length > 0 ? (
                alertHistory.map((alert) => (
                  <div key={alert.alertId} className="bg-slate-950 p-4 border border-slate-850/50 rounded-2xl text-xs space-y-3 text-left">
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider border-b border-slate-900 pb-1.5">
                      <span className="text-red-400 font-bold flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        🚨 EMERGENCY DISPATCH SENT
                      </span>
                      <span className="text-slate-500">{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                    
                    <div className="text-[11px] leading-relaxed text-slate-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-red-950/20 whitespace-pre-wrap">
                      {alert.message}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Notified Recipients:</span>
                      {alert.recipients.map((rec, i) => (
                        <span key={i} className="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-mono">
                          📩 {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-650 bg-slate-950/20 rounded-2xl border border-slate-900/40 italic">
                  Outbox is silent. No emergency dispatches triggered in the current session.
                </div>
              )}
            </div>
          </div>

          {/* AI DECISION BOUNDARY GEMINI RADAR SUMMARY CARD */}
          <div className="border border-indigo-900/30 bg-gradient-to-r from-indigo-950/15 via-slate-900/25 to-slate-900/40 p-6 rounded-3xl space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="space-y-1 bg">
                <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                  Gemini AI Safety Copilot
                </h4>
                <p className="text-xs text-slate-400">
                  Runs server-side AI evaluation on multidimensional G-force parameters and blood alcohol metrics.
                </p>
              </div>
              <button
                onClick={handleAiRiskAnalyze}
                disabled={aiLoading}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs px-4 py-2.5 text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md self-start"
              >
                {aiLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {aiLoading ? "Modeling..." : "Analyze Telemetry"}
              </button>
            </div>

            {aiResult ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-slate-800/80 animate-fade-in text-left">
                <div className="md:col-span-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-900 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">AI EVALUATED RISK</span>
                    <div className="text-3xl font-black text-cyan-400 font-mono mt-1">
                      {aiResult.riskScore}/100
                    </div>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-900/40">
                    <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">HAZARD SEVERITY</span>
                    <div className={`text-xs font-black mt-0.5 uppercase tracking-wide ${
                      aiResult.severityPrediction === "Critical" || aiResult.severityPrediction === "High" ? 'text-red-450 text-red-400' : 'text-blue-400'
                    }`}>
                      {aiResult.severityPrediction} Level
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8 bg-slate-950/20 p-4 rounded-2xl border border-slate-900/60 space-y-3 text-xs">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">CONTRIBUTED DANGER FACTORS</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {aiResult.factors.map((f, idx) => (
                        <span key={idx} className="bg-slate-900 border border-slate-850 text-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-mono font-medium">
                          • {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider block font-bold">RECOMMENDED INCIDENT ACTIONsuggestion</span>
                    <p className="text-xs text-slate-300 italic mt-1 font-sans leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                      "{aiResult.responseSuggestions}"
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center font-sans text-xs text-slate-500 py-6 bg-slate-950/20 rounded-2xl border border-slate-900/40">
                Execute 'Analyze Telemetry' to consult Gemini on potential crash hazards and emergency dispatch recommendations.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
