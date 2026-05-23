import React, { useState } from "react";
import { 
  BarChart3, TrendingUp, ShieldAlert, Award, Calendar, CheckCircle2, 
  XCircle, Filter, Zap, Compass, Activity, Moon, Clock, RefreshCw, Eye
} from "lucide-react";

interface AnalyticsViewProps {
  onNavigate: (page: string) => void;
}

export default function AnalyticsView({ onNavigate }: AnalyticsViewProps) {
  // Navigation & Category filters
  const [activeTab, setActiveTab] = useState<"overview" | "compliance" | "speed" | "sobriety">("overview");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "semester">("7d");
  const [selectedRider, setSelectedRider] = useState("all");

  // State to simulate extra telemetry points
  const [simulationMultiplier, setSimulationMultiplier] = useState(1.0);

  // Simulated metrics data
  const weeklyCompliance = [98, 95, 88, 94, 100, 92, 85].map(v => Math.min(100, Math.round(v * simulationMultiplier)));
  const speedRanges = [
    { label: "0-20", count: 120, color: "bg-blue-550" },
    { label: "21-40", count: 340, color: "bg-cyan-550" },
    { label: "41-60", count: 480, color: "bg-emerald-555" },
    { label: "61-80", count: 180, color: "bg-amber-550" },
    { label: "81+", count: 40, color: "bg-rose-550" }
  ];

  const historicalAccidents = [
    { month: "Nov", count: 2, severity: "High" },
    { month: "Dec", count: 1, severity: "Low" },
    { month: "Jan", count: 3, severity: "High" },
    { month: "Feb", count: 0, severity: "None" },
    { month: "Mar", count: 4, severity: "Moderate" },
    { month: "Apr", count: 1, severity: "Low" },
    { month: "May", count: 2, severity: "High" }
  ];

  const alcoholIncidents = [
    { day: "Mon", count: 150, locked: false },
    { day: "Tue", count: 280, locked: false },
    { day: "Wed", count: 520, locked: true }, // Locked out
    { day: "Thu", count: 110, locked: false },
    { day: "Fri", count: 380, locked: true }, // Locked out
    { day: "Sat", count: 640, locked: true }, // Locked out
    { day: "Sun", count: 210, locked: false }
  ];

  // Calculations for safe metrics rendering
  const totalRides = 1160;
  const averageSpeed = 46.5;
  const overallComplianceRate = Math.round(
    (weeklyCompliance.reduce((acc, curr) => acc + curr, 0) / weeklyCompliance.length)
  );
  
  // Custom SVG rendering coordinates for accident line chart (width: 500, height: 180)
  const generateLinePoints = (data: typeof historicalAccidents, width: number, height: number, maxVal: number) => {
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.count / maxVal) * height;
      return { x, y };
    });
  };

  const linePoints = generateLinePoints(historicalAccidents, 600, 150, 5);
  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L 600 150 L 0 150 Z`;

  return (
    <div className="space-y-8 py-4 animate-fade-in text-slate-100 text-left font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-block rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            METRICS & ACCIDENT MODELING
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">RideGuard+ Security Analytics</h1>
          <p className="text-gray-405 text-slate-400 text-sm leading-relaxed">
            A comprehensive, academic-grade review of driver behaviors. Analyze safety breaches, speed bands, and lock activations synced securely from the ESP32 network controllers.
          </p>
        </div>

        {/* TIME & FILTER CONTROLLERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "7d" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "30d" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange("semester")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === "semester" ? "bg-blue-650 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Semester Demo
            </button>
          </div>

          <button
            onClick={() => {
              setSimulationMultiplier(prev => prev === 1.0 ? 0.75 : 1.0);
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Vary Data
          </button>
        </div>
      </div>

      {/* CORE STATS HIGHLIGHT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Compliance Rating */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start text-emerald-400">
            <CheckCircle2 className="h-5 w-5 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Helmet Wear Rate</span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-3xl font-black font-mono">{overallComplianceRate}%</div>
            <p className="text-xs text-slate-400">Average helmet lock compliance</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/20 to-emerald-450" style={{ width: `${overallComplianceRate}%` }} />
        </div>

        {/* Speed Stats */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-cyan-400">
            <Compass className="h-5 w-5 animate-spin" style={{ animationDuration: "14s" }} />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Avg Trip Speed</span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-3xl font-black font-mono">{averageSpeed} km/h</div>
            <p className="text-xs text-slate-400">Within city road zones limits</p>
          </div>
        </div>

        {/* Locked Out Starters */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Sobriety Locks</span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-3xl font-black font-mono">3 Actions</div>
            <p className="text-xs text-slate-400">Engine lockouts triggered</p>
          </div>
        </div>

        {/* Academic Safe Margin */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-start text-blue-400">
            <Activity className="h-5 w-5" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Safety Index</span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="text-3xl font-black font-mono">92.4 / 100</div>
            <p className="text-xs text-slate-400">Rider safety coefficient rating</p>
          </div>
        </div>
      </div>

      {/* THREE-CARD ANALYTICS SPLIT WITH DYNAMIC SVG PLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: MULTI-TAB CHART INTERFACE */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6 backdrop-blur-md">
            
            {/* Nav tabs for charts */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  Behavioral Diagnostics Planners
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">Review analytical metrics using specialized visual charts.</p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-xs">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "overview" ? "bg-blue-600 text-white font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Accidents Trend
                </button>
                <button
                  onClick={() => setActiveTab("compliance")}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "compliance" ? "bg-blue-600 text-white font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Helmet Wear
                </button>
                <button
                  onClick={() => setActiveTab("speed")}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "speed" ? "bg-blue-600 text-white font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Speed Dist
                </button>
                <button
                  onClick={() => setActiveTab("sobriety")}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "sobriety" ? "bg-blue-600 text-white font-extrabold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Alcohol Readings
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: ACCIDENTS TREND (Line Chart with full grids) */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="relative bg-slate-950 rounded-2xl border border-slate-900 p-6 overflow-hidden">
                  <span className="absolute top-3 right-4 text-[9px] font-mono uppercase bg-red-950 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full font-bold">
                    Logged Crash History
                  </span>
                  
                  <div className="h-[160px] w-full relative pt-2">
                    <svg viewBox="0 0 600 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="0" x2="600" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="0" y1="37.5" x2="600" y2="37.5" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="75" x2="600" y2="75" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="112.5" x2="600" y2="112.5" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="0" y1="150" x2="600" y2="150" stroke="#1e293b" strokeWidth="1" />

                      {/* Area Fill styling */}
                      <defs>
                        <linearGradient id="accTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path d={areaPath} fill="url(#accTrendGrad)" />
                      <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Data dots circles */}
                      {linePoints.map((pt, index) => (
                        <g key={index} className="group cursor-pointer">
                          <circle cx={pt.x} cy={pt.y} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx={pt.x} cy={pt.y} r="10" fill="#ef4444" opacity="0.2" className="hover:scale-150 transition-transform" />
                        </g>
                      ))}
                    </svg>

                    {/* Timeline references */}
                    <div className="flex justify-between font-mono text-[9.5px] text-slate-550 text-slate-500 mt-2">
                      {historicalAccidents.map((d, i) => (
                        <div key={i} className="text-center font-bold">
                          <div>{d.month}</div>
                          <div className={d.count > 0 ? "text-red-400 font-extrabold" : "text-slate-600"}>{d.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-slate-950 p-4 border border-slate-900 rounded-xl leading-relaxed text-xs">
                  <TrendingUp className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-slate-400 font-sans">
                    Academic Analysis: Crash occurrences peaked heavily during January and March due to rain hazards, prompting the ESP32 collision system to automate SMS broadcasts safely across 100% of logs.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: HELMET COMPLIANCE */}
            {activeTab === "compliance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Progress lines */}
                  <div className="space-y-4 text-xs font-semibold text-slate-350 bg-slate-950 p-5 rounded-2xl border border-slate-900">
                    <h4 className="text-white text-sm font-bold border-b border-slate-900 pb-2 mb-3">Daily Lock-worn Rates</h4>
                    
                    {weeklyCompliance.map((v, i) => {
                      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      return (
                        <div key={i} className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-baseline">
                            <span className="text-slate-400 font-mono font-bold uppercase">{days[i]} Compliance</span>
                            <span className={v < 90 ? "text-rose-400" : "text-emerald-400"}>{v}%</span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${v < 90 ? "bg-rose-500" : "bg-emerald-500"}`} 
                              style={{ width: `${v}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Circle Radial meter compliance status */}
                  <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4 relative">
                    <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider font-extrabold">Compliance Index</span>
                    
                    <div className="relative flex items-center justify-center">
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle cx="72" cy="72" r="60" stroke="#10b981" fill="transparent" strokeWidth="12" opacity="0.1" />
                        <circle 
                          cx="72" 
                          cy="72" 
                          r="60" 
                          stroke="#10b981" 
                          fill="transparent" 
                          strokeWidth="12" 
                          strokeDasharray={376.8}
                          strokeDashoffset={376.8 - (376.8 * overallComplianceRate) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      
                      <div className="absolute font-mono text-center space-y-0.5">
                        <div className="text-3xl font-black font-mono text-emerald-400">{overallComplianceRate}%</div>
                        <div className="text-[9px] uppercase text-slate-500 font-bold">Worn lock</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans px-2">
                      IR Proximity sensor compliance logged at <b className="text-emerald-400">{overallComplianceRate}%</b>. Bike ignition start remains locked during unworn tests.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* TAB CONTENT 3: SPEED DISTRIBUTION BARS */}
            {activeTab === "speed" && (
              <div className="space-y-4">
                <div className="bg-slate-955 bg-slate-950 rounded-2xl border border-slate-900 p-6 space-y-5">
                  <h4 className="font-bold text-white text-sm">Velocity Distribution (Time spent in km/h bands)</h4>
                  
                  <div className="space-y-4">
                    {speedRanges.map((bar, i) => {
                      const totalCounts = speedRanges.reduce((acc, c) => acc + c.count, 0);
                      const percentage = Math.round((bar.count / totalCounts) * 100);
                      return (
                        <div key={i} className="space-y-1 text-xs">
                          <div className="flex justify-between items-baseline leading-normal">
                            <span className="font-mono text-slate-300 font-semibold">{bar.label} km/h spectrum</span>
                            <span className="text-slate-500 font-medium">({bar.count} mins, <b className="text-white font-bold">{percentage}%</b>)</span>
                          </div>
                          
                          <div className="w-full bg-slate-900 h-3.5 rounded-lg overflow-hidden flex">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                i > 3 ? "bg-rose-500" : i > 2 ? "bg-amber-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-900 pt-3 text-[10.5px] font-mono text-slate-500">
                  <span>Safety limit guard: 60 km/h</span>
                  <span>Overspeed events flagged: 4</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: SOBRIETY MQ DETECTIONS */}
            {activeTab === "sobriety" && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-white text-sm">MQ-3 Weekly Alcohol Peak Readings (PPM)</h4>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-stretch gap-3">
                    {alcoholIncidents.map((day, i) => {
                      return (
                        <div 
                          key={i} 
                          className={`flex-1 p-3 rounded-xl border flex flex-col justify-between text-center min-h-[100px] transition-colors ${
                            day.locked 
                              ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                              : "bg-slate-900/50 border-slate-900/60 text-slate-350"
                          }`}
                        >
                          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">{day.day}</div>
                          <div className="font-mono font-black text-sm my-1">{day.count} <span className="text-[9px] font-normal">PPM</span></div>
                          
                          <div className={`text-[8.5px] font-mono font-bold uppercase rounded py-0.5 px-1 inline-block mt-1 ${
                            day.locked ? "bg-red-950 text-red-400 border border-red-500/20 animate-pulse" : "bg-slate-950 text-slate-550"
                          }`}>
                            {day.locked ? "Starter cut" : "Clear"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic leading-relaxed text-center font-sans font-medium">
                  Note: Any alcohol ppm sensor spike &gt; 300 PPM triggers immediate starter-relay lock out, and flags warning alerts.
                </p>
              </div>
            )}

          </div>

          {/* DYNAMIC TELEMETRY LOGS FEEDING FLOW */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-white text-base">Academic Modeling Simulation Parameters</h4>
            <p className="text-xs text-slate-400">
              This panel enables observers to evaluate RideGuard+ software responsiveness by altering simulation variables. Try changing constraints below.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-900/80 rounded-2xl">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">1. Helmet wear compliance threshold</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={weeklyCompliance[0]}
                    onChange={(e) => {}}
                    disabled
                    className="w-full h-1 bg-slate-900 rounded appearance-none cursor-not-allowed accent-blue-500"
                  />
                  <span className="font-mono font-bold text-xs text-emerald-400">{weeklyCompliance[0]}%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">2. Alcohol Starter lock simulation</span>
                <div className="flex gap-2.5">
                  <span className="px-2 py-1 rounded bg-rose-950/40 text-rose-400 text-[10.5px] border border-rose-500/15 font-mono font-semibold">Starter lock active</span>
                  <span className="px-2 py-1 rounded bg-slate-950 text-slate-500 text-[10.5px] border border-slate-850 font-mono">Bypass relay key</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: REVENUE IMPACT PANELS & BEHAVIOR RECOMMENDATIONS */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* SECURE BIOMETRIC DETAILS ARCS */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />
            <span className="text-[9px] font-mono tracking-wider text-slate-500 font-black uppercase">IoT CLOUD NODE SPEC</span>
            
            <h3 className="font-bold text-white text-base">Node Telemetry Quality</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Wireless transmissions logs generated continuously over ports. GPS update frequency maintains satellite locking integrity.
            </p>

            <div className="space-y-3 pt-3 border-t border-slate-950/60 font-mono text-[11px]">
              <div className="flex justify-between border-b border-slate-950/50 pb-1.5">
                <span className="text-slate-450 text-slate-500">Node Signal strength:</span>
                <span className="text-emerald-400 font-bold">-62 dBm (Excellent)</span>
              </div>
              <div className="flex justify-between border-b border-slate-950/50 pb-1.5">
                <span className="text-slate-450 text-slate-500">Latency to Cloud RTDB:</span>
                <span className="text-slate-300 font-bold">14 ms</span>
              </div>
              <div className="flex justify-between border-b border-slate-950/50 pb-1.5">
                <span className="text-slate-450 text-slate-500">Daily Packet Loss:</span>
                <span className="text-emerald-400 font-bold">0.03%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 text-slate-500">ESP32 Loop Latency:</span>
                <span className="text-slate-300 font-bold">8 ms average</span>
              </div>
            </div>
          </div>

          {/* ACADEMIC BEHAVIOR SAFETY REPORT CARD */}
          <div className="bg-indigo-950/15 border border-indigo-900/30 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-1.5 uppercase tracking-wide">
              <Award className="h-4.5 w-4.5" />
              Safety Report Card
            </h4>
            
            <p className="text-slate-400 text-xs leading-relaxed font-sans">
              Alex Vance has shown impressive adherence boundaries with over <b>92% Lock Compliance Rate</b>. Rapid speed warnings were handled immediately with throttle control.
            </p>

            <div className="bg-slate-950 p-4 border border-indigo-950/40 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-450">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-slate-300">Sobriety test passed: <b>98%</b></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-450">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-slate-300">Zero active pending crashes</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-slate-300">Minor overspeed warning alerts triggered</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate("dashboard")}
              className="w-full bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50 border border-indigo-500/20 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
                >
              Open Live Telem Dashboard
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
