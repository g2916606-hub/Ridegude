import React, { useState } from "react";
import { 
  ShieldAlert, Users, ShieldCheck, HardDrive, BarChart3, Clock, HelpCircle,
  Activity, Radio, Siren, Cpu, Settings, Smartphone, CheckCircle, RefreshCw, AlertTriangle
} from "lucide-react";
import { DashboardPayload } from "../types";
import { updateHelmetData } from "../firebase";

interface AdminPanelViewProps {
  payload: DashboardPayload;
  onUpdateAccidentStatus: (accidentId: string, status: string) => void;
}

export default function AdminPanelView({ payload, onUpdateAccidentStatus }: AdminPanelViewProps) {
  const { accidentLogs, contacts, sosLogs, sensorData, alertHistory = [] } = payload;
  const [activeTab, setActiveTab] = useState<"riders" | "sos" | "accidents" | "alerts" | "monitoring">("riders");

  // Local simulated riders data for administrative demonstration
  const [riders, setRiders] = useState([
    {
      userId: "user-1",
      name: "Alex Vance",
      email: "g2916656@gmail.com",
      bloodGroup: "O-Positive",
      bikeModel: "Yamaha MT-07 (700cc)",
      deviceId: "ESP32-RG-772",
      status: "Active",
      ignitionLock: sensorData.alcoholLevel > 300,
      helmetStatus: sensorData.worn ? "Worn" : "Unworn",
      signal: "Excel (-64dBm)"
    },
    {
      userId: "user-2",
      name: "Marcus Aurelius",
      email: "marcus.a@stoic.org",
      bloodGroup: "A-Negative",
      bikeModel: "BMW R 1250 GS (1250cc)",
      deviceId: "ESP32-RG-110",
      status: "Active",
      ignitionLock: false,
      helmetStatus: "Worn",
      signal: "Good (-72dBm)"
    },
    {
      userId: "user-3",
      name: "Sarah Jenkins",
      email: "s.jenkins@transit.gov",
      bloodGroup: "B-Positive",
      bikeModel: "Honda CB500F (500cc)",
      deviceId: "ESP32-RG-415",
      status: "Suspended",
      ignitionLock: true,
      helmetStatus: "Unworn",
      signal: "Offline"
    }
  ]);

  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Admin session started. Ready for diagnostics.`,
    `[${new Date().toLocaleTimeString()}] Sync link established to Cloud Firestore & Realtime RTDB.`,
    `[${new Date().toLocaleTimeString()}] MPU6050 Accelerometer calibration: OK.`
  ]);

  const [pingingId, setPingingId] = useState<string | null>(null);

  // Stats calculation
  const totalAccidents = accidentLogs.length;
  const pendingCount = accidentLogs.filter(a => a.status === "Pending").length;
  const activeSOS = sosLogs.filter(s => s.status === "Active").length;

  const handleIgnitionOverride = async (userId: string, currentLock: boolean) => {
    if (userId === "user-1") {
      try {
        // Toggle simulated alcohol level to mock ign lock override
        const nextAlcohol = currentLock ? 120 : 450;
        await updateHelmetData({ alcoholLevel: nextAlcohol });
        addDiagLog(`Ignition lock overridden for user ${userId}. MQ level set to ${nextAlcohol} PPM.`);
      } catch (e) {
        console.error(e);
      }
    } else {
      setRiders(prev => prev.map(r => r.userId === userId ? { ...r, ignitionLock: !r.ignitionLock } : r));
      addDiagLog(`Ignition starter status overridden to ${!currentLock ? 'LOCKED' : 'UNLOCKED'} for rider ${userId}.`);
    }
  };

  const handleRiderPing = (riderId: string) => {
    setPingingId(riderId);
    addDiagLog(`Initiating remote telemetry ping sequence for node ID: ${riderId}...`);
    setTimeout(() => {
      setPingingId(null);
      addDiagLog(`Ping successful! Round trip latency to node ${riderId}: 42ms. Loss 0%.`);
    }, 1500);
  };

  const handleResolveSOSAll = async () => {
    try {
      await updateHelmetData({ sosPressed: false });
      addDiagLog("SOS alarms resolved manually. Node broadcast triggers reset.");
    } catch (e) {
      console.error(e);
    }
  };

  const addDiagLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDiagnosticLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 15));
  };

  return (
    <div className="space-y-8 py-4 animate-fade-in text-gray-100 text-left font-sans">
      
      {/* HEADER SECTION */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-block rounded-lg bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
          OPERATIONS CENTER COMMAND
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">System Operations Admin Console</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Administer active riders, coordinate instant dispatch overrides, examine SMS gateway histories, and monitor virtual server logs in real-time.
        </p>
      </div>

      {/* CORE STATS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-indigo-400">
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">RIDER LIST</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">{riders.length} Registered</div>
            <p className="text-xs text-slate-400 mt-1">{riders.filter(r => r.status === "Active").length} Active nodes logged</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-emerald-400">
            <Cpu className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">GATEWAY NODES</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">ESP32 v3.1</div>
            <p className="text-xs text-slate-400 mt-1">Realtime firmware link: OK</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-rose-500">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">CRASH HISTORY</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-400">{totalAccidents} cases</div>
            <p className="text-xs text-slate-400 mt-1">
              {pendingCount} countdown{pendingCount === 1 ? "" : "s"} awaiting dispatch confirm.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-yellow-500">
            <Radio className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">DISTRESS ALARMS</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-yellow-400">{activeSOS} SOS Signal</div>
            <p className="text-xs text-slate-400 mt-1">Manual triggers currently active</p>
          </div>
        </div>
      </div>

      {/* ADMIN TABS CONSOLE SWITCHER */}
      <div className="space-y-6">
        <div className="flex flex-wrap border-b border-slate-800 pb-2 gap-2">
          {[
            { id: "riders", label: "Rider Management", icon: Users },
            { id: "sos", label: "SOS Incident Logs", icon: Radio },
            { id: "accidents", label: "Accident Reports", icon: ShieldAlert },
            { id: "alerts", label: "Alert History", icon: Clock },
            { id: "monitoring", label: "System Diagnostic Monitoring", icon: Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  addDiagLog(`Navigated tab to: ${tab.label}.`);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-indigo-650 text-white shadow-md bg-indigo-600"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: RIDER MANAGEMENT */}
        {activeTab === "riders" && (
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Rider Registry Management Console</h3>
              <p className="text-xs text-slate-400">View real-time credentials, signal state, and override starter ignition locks.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
                <thead>
                  <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-extrabold pb-3">
                    <th className="py-3 px-4">Rider Profile</th>
                    <th className="py-3 px-4">Connected Hardware Node</th>
                    <th className="py-3 px-4">Ignition starter bypass</th>
                    <th className="py-3 px-4 text-center">Diagnostics Ping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/10">
                  {riders.map((r) => {
                    const isMainUser = r.userId === "user-1";
                    const isWorn = isMainUser ? sensorData.worn : r.helmetStatus === "Worn";
                    const hasAlcohol = isMainUser ? sensorData.alcoholLevel > 300 : r.ignitionLock;

                    return (
                      <tr key={r.userId} className="hover:bg-slate-950/20 transition-all font-sans">
                        <td className="py-4 px-4 space-y-1">
                          <div className="font-bold text-white text-sm">{r.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.email} | Blood Type: <b>{r.bloodGroup}</b></div>
                        </td>
                        <td className="py-4 px-4 space-y-1">
                          <div className="font-mono text-[11px] font-bold text-slate-200">{r.deviceId}</div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className={`h-1.5 w-1.5 rounded-full ${r.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                            <span className="text-slate-400">{r.bikeModel}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleIgnitionOverride(r.userId, hasAlcohol)}
                            className={`rounded-lg px-3 py-1.5 font-mono font-bold text-[10px] uppercase cursor-pointer transition-all ${
                              hasAlcohol 
                                ? "bg-red-950/40 text-red-400 border border-red-500/15" 
                                : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/15"
                            }`}
                          >
                            {hasAlcohol ? "Ignition Locked" : "System Clear"}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleRiderPing(r.userId)}
                            disabled={pingingId === r.userId}
                            className="bg-slate-950 hover:bg-slate-800 text-[10px] font-mono font-bold uppercase py-1.5 px-3 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {pingingId === r.userId ? "Pinging..." : "Test ping Link"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SOS INCIDENT OPERATIONS LOG */}
        {activeTab === "sos" && (
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Distress SOS Beacon Registry</h3>
                <p className="text-xs text-slate-400">View real-time or simulated manual panic button signals transmitted to cellular links.</p>
              </div>

              {activeSOS > 0 && (
                <button
                  onClick={handleResolveSOSAll}
                  className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-all font-sans"
                >
                  Resolve SOS Beacons
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sosLogs.map((sos) => (
                <div key={sos.sosId} className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex justify-between items-center text-left leading-normal">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4.5 w-4.5 text-yellow-500 animate-ping" />
                      <span className="font-mono text-xs font-extrabold uppercase text-slate-300">
                        SOS ID: #{sos.sosId.substring(9, 14)}
                      </span>
                      <span className="bg-amber-950/40 text-amber-400 border border-amber-500/15 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase">
                        ACTIVE ALARM TRANSMITTING
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Coordinates: <span className="font-mono text-slate-200">{sos.lat.toFixed(6)}, {sos.lng.toFixed(6)}</span> | 
                      Time: <span className="font-mono text-slate-200">{new Date(sos.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResolveSOSAll}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-yellow-400 text-[10px] font-mono font-bold uppercase py-2 px-3 rounded-xl transition-all cursor-pointer"
                    >
                      Reset Distress Beacon
                    </button>
                  </div>
                </div>
              ))}

              {sosLogs.length === 0 && (
                <div className="text-center py-16 border border-slate-850 bg-slate-900/10 rounded-2xl text-slate-500 text-xs text-left leading-relaxed max-w-lg mx-auto">
                  <div className="flex justify-center mb-2">
                    <ShieldCheck className="h-8 w-8 text-slate-650" />
                  </div>
                  <b>No active SOS distress signals logged.</b> All rider hardware interfaces are currently in secure monitoring mode.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACCIDENTS REPORTS */}
        {activeTab === "accidents" && (
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Active & Archive Crash Incident Dispatches</h3>
              <p className="text-xs text-slate-400">Manually alter dispatch status values to mock emergency responses.</p>
            </div>

            <div className="space-y-4 pt-2">
              {accidentLogs.map((log) => (
                <div
                  key={log.accidentId}
                  className="bg-slate-950/50 border border-slate-850 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-xs text-slate-400 font-semibold">
                      CASE ID: #{log.accidentId.substring(4, 9)} | {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      log.status === "Pending" ? "bg-amber-955 bg-amber-950 text-amber-400 border border-amber-500/20 animate-pulse" :
                      log.status === "Safe" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                      "bg-red-955 bg-red-950 text-red-300 border border-red-550/20"
                    }`}>
                      {log.status === "Help Sent" ? "Ambulance Dispatched" : log.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">Predicted Severity (Gemini Model)</span>
                      <span className="font-bold text-sky-400 text-sm">{log.severityPrediction}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">Telemetry G-Force Crash Rating</span>
                      <span className="font-bold text-yellow-400 text-sm">{log.riskScore}/100</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 bg-slate-900/30 p-3.5 border border-slate-900 rounded-xl leading-normal text-left">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Unsafe Factors Identified</span>
                    {log.factors && log.factors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {log.factors.map((f, i) => (
                          <span key={i} className="bg-slate-950 border border-slate-850 rounded px-2.5 py-0.5 text-[10px] text-slate-300 font-mono">
                            {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>No extreme threshold factors flagged. Critical structural collision.</span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-900/60">
                    <button
                      onClick={() => {
                        onUpdateAccidentStatus(log.accidentId, "Safe");
                        addDiagLog(`Case #${log.accidentId.substring(4,9)} marked manually as SAFE.`);
                      }}
                      className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 bg-slate-950 border border-slate-800 hover:bg-slate-850 px-3 py-1.5 rounded-xl font-mono transition-colors cursor-pointer"
                    >
                      Set Safe
                    </button>
                    <button
                      onClick={() => {
                        onUpdateAccidentStatus(log.accidentId, "Help Sent");
                        addDiagLog(`911 response dispatched aggressively for Case #${log.accidentId.substring(4,9)}.`);
                      }}
                      className="text-[10px] uppercase font-bold text-rose-450 text-rose-450 hover:text-rose-350 bg-slate-920 bg-slate-950 border border-slate-800 hover:bg-slate-850 px-3 py-1.5 rounded-xl font-mono transition-colors cursor-pointer"
                    >
                      Dispatch Responders Node
                    </button>
                  </div>
                </div>
              ))}

              {accidentLogs.length === 0 && (
                <div className="text-center text-slate-500 py-12 text-xs">
                  No active accident dispatches logged on the network.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ALERT BROADCAST HISTORY */}
        {activeTab === "alerts" && (
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">Alert Delivery gateway Transmission history</h3>
              <p className="text-xs text-slate-400">Review SMS transmissions and maps coordinate payloads sent over networks.</p>
            </div>

            <div className="space-y-4">
              {alertHistory.map((item) => (
                <div key={item.alertId} className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-3 leading-normal">
                  <div className="flex justify-between items-baseline font-mono border-b border-slate-900 pb-2">
                    <span className="text-[10.5px] text-slate-400 font-bold">TRANSMISSION ID: #{item.alertId.substring(6, 11)}</span>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Sent via cellular
                    </span>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-900 text-[10.5px] font-mono text-indigo-350 text-indigo-300">
                      {item.message}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9.5px] uppercase font-mono text-slate-500 font-bold block">Guardian SMS Subscribers:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.recipients.map((rec, k) => (
                          <span key={k} className="bg-slate-900 text-slate-350 border border-slate-850 rounded px-2.5 py-0.5 text-[10px]">
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {alertHistory.length === 0 && (
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-10 text-center text-slate-500 text-xs">
                  No alerts currently stored on local server memory arrays. Trigger a crash simulation or manual SOS to watch the output.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: DIAGNOSTIC TELEMETRY LOGS */}
        {activeTab === "monitoring" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Health indicators */}
            <div className="lg:col-span-4 bg-slate-950 rounded-2xl border border-slate-850 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">Hardware Link Health</h4>
                
                <div className="space-y-3 pt-2 text-[11px] leading-normal uppercase font-mono">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Firebase DB latency:</span>
                      <span className="text-emerald-450 text-emerald-400 font-bold">14 ms (Stable)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: "95%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">CPU Load (Virtual Hub):</span>
                      <span className="text-indigo-400 font-bold">4.2% Load</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: "12%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telemetry Packet Rate:</span>
                      <span className="text-slate-300 font-bold">0.8 packets / sec</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: "38%" }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-xl leading-relaxed text-xs">
                <span className="font-semibold text-indigo-300 text-[10px] font-mono block uppercase mb-1">Port mapping diagnostic</span>
                <p className="text-slate-400">
                  Dual MQTT and HTTP channels operating perfectly over port 3000 mapping protocols.
                </p>
              </div>
            </div>

            {/* Terminal Live feed */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between">
              <div className="space-y-3 flex-1 flex flex-col justify-between h-80">
                <div className="flex justify-between items-baseline border-b border-slate-900 pb-2 mb-2">
                  <span className="font-bold text-white text-sm">Real-time Terminal Output Feed</span>
                  <span className="text-[9px] font-mono text-emerald-400 animate-pulse uppercase">LIVE STREAM STATUS</span>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-xl font-mono text-[10.5px] text-emerald-500 text-slate-300 text-left overflow-y-auto flex-1 space-y-1.5 h-64 min-h-[180px]">
                  {diagnosticLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
