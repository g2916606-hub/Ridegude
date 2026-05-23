import React, { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { 
  MapPin, Navigation, Compass, Calendar, Activity, CheckCircle2, 
  ExternalLink, Siren, Radio, Send, LifeBuoy, AlertOctagon, ShieldAlert,
  Layers, Map as MapIcon, RotateCcw, Plus, Info, ChevronRight, HelpCircle
} from "lucide-react";
import { DashboardPayload, LocationHistory, AccidentLog } from "../types";

// Retrieve Google Maps API key injected from AI Studio environments
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

// Helper component to render polyline routes on the Google Map using the native Maps API
function Polyline({ path, strokeColor = "#3b82f6", strokeWeight = 5 }: {
  path: google.maps.LatLngLiteral[];
  strokeColor?: string;
  strokeWeight?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !path || path.length === 0) return;

    const googlePolyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: 0.85,
      strokeWeight,
    });

    googlePolyline.setMap(map);

    // Auto-adjust bounds to fit path if desired
    if (path.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach(pt => bounds.extend(pt));
      map.fitBounds(bounds);
    }

    return () => {
      googlePolyline.setMap(null);
    };
  }, [map, path, strokeColor, strokeWeight]);

  return null;
}

interface LiveMapViewProps {
  payload: DashboardPayload;
  onRefresh?: () => void;
}

export default function LiveMapView({ payload, onRefresh }: LiveMapViewProps) {
  const { locationHistory, accidentLogs, sensorData } = payload;

  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lng: number; title: string; desc?: string } | null>(null);
  
  // Custom manual Coordinate Spawner states for simulation
  const [customLat, setCustomLat] = useState("37.779213");
  const [customLng, setCustomLng] = useState("-122.411124");
  const [customSpeed, setCustomSpeed] = useState("45");
  const [isSpawning, setIsSpawning] = useState(false);

  // Parse chronological coordinate trail
  const pathCoordinates: google.maps.LatLngLiteral[] = locationHistory.map((loc) => ({
    lat: loc.lat,
    lng: loc.lng
  }));

  // Sort coordinate logs chronologically descending
  const logsSorted = [...locationHistory].reverse();

  // Pick rider current location coordinates, default to standard San Francisco center
  const riderLocation = locationHistory.length > 0 
    ? { lat: locationHistory[locationHistory.length - 1].lat, lng: locationHistory[locationHistory.length - 1].lng }
    : { lat: 37.779213, lng: -122.411124 };

  const handleSimulateGPSAddition = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    const speedNum = parseFloat(customSpeed);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(speedNum)) return;

    setIsSpawning(true);
    try {
      const resp = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latNum, lng: lngNum, speed: speedNum })
      });
      if (resp.ok) {
        if (onRefresh) onRefresh();
        // Shift simulated target coordinate forward slightly for quick consecutive testing!
        setCustomLat((latNum + 0.00132).toFixed(6));
        setCustomLng((lngNum + 0.00194).toFixed(6));
      }
    } catch (err) {
      console.error("GPS Add Error:", err);
    } finally {
      setIsSpawning(false);
    }
  };

  const handleResetHistory = async () => {
    // Clear logs to review pristine map lines
    try {
      await fetch("/api/notifications/clear", { method: "POST" });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 py-4 animate-fade-in text-gray-100">
      
      {/* UI Top header summary block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 text-left">
        <div className="max-w-2xl space-y-2">
          <div className="inline-block rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            GIS CARTOGRAPHY UNIT
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl animate-fade-in">Live Navigation Fleet Map</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Continuously plots ESP32's NEO-6M satellite telemetry vectors. If critical deceleration ranks occur, map nodes lock onto the emergency zones to guide ambulance routing with extreme precision.
          </p>
        </div>

        {/* Sync Feed Quick Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh Telemetry Feed
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* INTERACTIVE TRACKING MAP CANVAS */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
            <div>
              <h3 className="font-bold text-white text-base">Rider Satellite Geoposition</h3>
              <p className="text-xs text-slate-400">Continuous path plotting & incident highlight vectors.</p>
            </div>
            
            {/* Top Toolbar controls */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/60 px-3 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "15s" }} />
                <span>ACTIVE satellite signal</span>
              </div>
              
              {hasValidKey && (
                <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-[10px]">
                  <button 
                    onClick={() => setMapType("roadmap")} 
                    className={`px-2.5 py-1 rounded-lg ${mapType === "roadmap" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Road
                  </button>
                  <button 
                    onClick={() => setMapType("hybrid")} 
                    className={`px-2.5 py-1 rounded-lg ${mapType === "hybrid" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Satellite
                  </button>
                  <button 
                    onClick={() => setMapType("terrain")} 
                    className={`px-2.5 py-1 rounded-lg ${mapType === "terrain" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Terrain
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAIN GRAPHICS viewport */}
          <div className="h-[480px] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative">
            
            {hasValidKey ? (
              // GOOGLE MAPS API ACTIVE CONTAINER
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  defaultCenter={riderLocation}
                  center={riderLocation}
                  defaultZoom={15}
                  zoom={15}
                  mapTypeId={mapType}
                  gestureHandling={"cooperative"}
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: "100%", height: "100%" }}
                >
                  
                  {/* Real-time path Polyline mapping */}
                  <Polyline path={pathCoordinates} strokeColor="#3b82f6" strokeWeight={5} />

                  {/* Rider Current Pin Marker */}
                  <AdvancedMarker 
                    position={riderLocation} 
                    title="Active Rider Current Coordinates"
                    onClick={() => setSelectedPin({
                      lat: riderLocation.lat,
                      lng: riderLocation.lng,
                      title: "Alex Vance (Rider)",
                      desc: `Current speed: ${sensorData.speed} km/h, device payload updated: < 2 secs ago`
                    })}
                  >
                    {/* Visual glowing rider pointer pin */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 animate-ping" />
                      <div className="absolute h-6 w-6 rounded-full bg-emerald-500/40 border-2 border-emerald-300 flex items-center justify-center shadow-lg">
                        <Navigation className="h-3.5 w-3.5 text-slate-950 transform rotate-45 animate-pulse" />
                      </div>
                    </div>
                  </AdvancedMarker>

                  {/* Accident location highlight markers */}
                  {accidentLogs.map((log) => {
                    const isHelpSent = log.status === "Help Sent";
                    const isPending = log.status === "Pending";
                    const isEmergency = isHelpSent || isPending;

                    return (
                      <AdvancedMarker 
                        key={log.accidentId}
                        position={{ lat: log.lat, lng: log.lng }}
                        title={`Accident case: ${log.status}`}
                        onClick={() => setSelectedPin({
                          lat: log.lat,
                          lng: log.lng,
                          title: `Accident Critical Event #${log.accidentId.substring(4,9)}`,
                          desc: `G-Forces registered risk score of ${log.riskScore}/100 with category ${log.severityPrediction}. State: ${log.status}`
                        })}
                      >
                        {/* Red hazard ring indicator */}
                        <div className="relative flex items-center justify-center">
                          {isEmergency && (
                            <>
                              <div className="absolute h-14 w-14 rounded-full bg-rose-600/30 border border-red-500/40 animate-ping" />
                              <div className="absolute h-9 w-9 rounded-full bg-red-600/50 border border-red-400 animate-pulse" />
                            </>
                          )}
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 shadow-lg ${
                            log.status === "Safe" 
                              ? 'bg-emerald-600 border-emerald-300' 
                              : 'bg-red-600 border-red-300 animate-bounce'
                          }`}>
                            <Siren className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                </Map>
              </APIProvider>
            ) : (
              // HIGH FIDELITY SIMULATED FALLBACK MAP GRID (WITH KEY ASSISTANCE BOX)
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                {/* SVG vector roadmap grid representing city grid */}
                <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:25px_25px]" />
                
                <svg className="absolute inset-0 w-full h-full text-slate-800" xmlns="http://www.w3.org/2000/svg">
                  {/* Diagonal and vertical coordinate overlay grids */}
                  <line x1="0" y1="80" x2="900" y2="430" stroke="#1e293b" strokeWidth="8" opacity="0.5" />
                  <line x1="120" y1="0" x2="280" y2="480" stroke="#1e293b" strokeWidth="6" opacity="0.4" />
                  <line x1="420" y1="0" x2="380" y2="480" stroke="#1e293b" strokeWidth="4" opacity="0.3" />
                  <line x1="0" y1="280" x2="900" y2="280" stroke="#1e293b" strokeWidth="6" opacity="0.4" />

                  {/* Route History Line trail vector */}
                  {pathCoordinates.length > 1 && (
                    <g>
                      <path 
                        d={`M ${pathCoordinates.map((c, i) => {
                          // Project coordinate literals onto svg relative ratios for extreme realism!
                          const x = 150 + ((c.lng - (-122.422)) / (0.018)) * 500;
                          const y = 380 - ((c.lat - 37.772) / (0.012)) * 300;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}`}
                        stroke="#2563eb" 
                        strokeWidth="5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        fill="none" 
                        opacity="0.8" 
                      />
                      <path 
                        d={`M ${pathCoordinates.map((c, i) => {
                          const x = 150 + ((c.lng - (-122.422)) / (0.018)) * 500;
                          const y = 380 - ((c.lat - 37.772) / (0.012)) * 300;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}`}
                        stroke="#60a5fa" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        fill="none" 
                        strokeDasharray="4 4"
                      />
                    </g>
                  )}

                  {/* Nodes list */}
                  {locationHistory.map((pt, index) => {
                    const x = 150 + ((pt.lng - (-122.422)) / (0.018)) * 500;
                    const y = 380 - ((pt.lat - 37.772) / (0.012)) * 300;
                    const isLast = index === locationHistory.length - 1;

                    return (
                      <g key={index}>
                        {isLast ? (
                          <>
                            <circle cx={x} cy={y} r="16" fill="#10b981" fillOpacity="0.12" className="animate-ping animate-duration-1000" />
                            <circle cx={x} cy={y} r="9" fill="#10b981" fillOpacity="0.3" />
                            <circle cx={x} cy={y} r="5" fill="#10b981" />
                          </>
                        ) : (
                          <circle cx={x} cy={y} r="3.5" fill="#3b82f6" opacity="0.6" />
                        )}
                      </g>
                    );
                  })}

                  {/* Active Accident location highlights */}
                  {accidentLogs.map((log, index) => {
                    const x = 150 + ((log.lng - (-122.422)) / (0.018)) * 500;
                    const y = 380 - ((log.lat - 37.772) / (0.012)) * 300;
                    const isEmergency = log.status === "Pending" || log.status === "Help Sent";

                    return (
                      <g key={index}>
                        {isEmergency && (
                          <>
                            <circle cx={x} cy={y} r="24" fill="#ef4444" fillOpacity="0.15" className="animate-pulse" />
                            <circle cx={x} cy={y} r="12" fill="#ef4444" fillOpacity="0.25" />
                          </>
                        )}
                        <circle cx={x} cy={y} r="6" fill="#ef4444" />
                      </g>
                    );
                  })}
                </svg>

                {/* HUD Setup guide card overlay */}
                <div className="z-10 max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex gap-3 text-left items-start">
                    <div className="bg-blue-600/10 text-blue-400 p-2.5 rounded-2xl border border-blue-500/20 shrink-0">
                      <MapIcon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">Unlock Official Google Maps</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        The mapping telemetry engine is ready to plot paths dynamically. To activate real-time street imagery, add your API key.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl text-left text-xs text-slate-300 leading-relaxed border border-slate-800 space-y-2">
                    <p className="font-semibold text-slate-200">How to establish Map connection:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] font-mono">
                      <li>Obtain a key from: <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Map Start</a></li>
                      <li>Open AI Studio **Settings** (⚙️ top right)</li>
                      <li>Click **Secrets** → Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as name</li>
                      <li>Paste your key and press Enter.</li>
                    </ol>
                  </div>
                  
                  <div className="text-[10px] text-emerald-400 font-mono tracking-wider bg-emerald-950/20 border border-emerald-900/30 py-1.5 px-3 rounded-full inline-block">
                    📡 RADAR CONTINUOUS BACK-UP GPS SIMULATION MODE ACTIVE
                  </div>
                </div>

              </div>
            )}

            {/* Bottom Floating Telemetry Info Display HUD */}
            <div className="absolute inset-x-4 bottom-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left select-none shadow-xl">
              <div className="flex gap-2 text-xs">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 block font-mono text-[9px] uppercase font-bold text-[8.5px]">GPS TRANS-LINK STATUS</span>
                  <span className="text-slate-200 mt-0.5 block font-bold text-xs">{payload.user.deviceId} Lock</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-xs shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <div>
                  <span className="text-slate-500 block font-mono text-[9px] uppercase font-bold text-[8.5px]">LATITUDE</span>
                  <span className="text-slate-100 font-mono text-xs block font-extrabold mt-0.5">{riderLocation.lat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono text-[9px] uppercase font-bold text-[8.5px]">LONGITUDE</span>
                  <span className="text-slate-100 font-mono text-xs block font-extrabold mt-0.5">{riderLocation.lng.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-mono text-[9px] uppercase font-bold text-[8.5px]">VELOCITY</span>
                  <span className="text-emerald-400 font-mono text-xs block font-extrabold mt-0.5">{sensorData.speed} km/h</span>
                </div>
              </div>
            </div>

            {/* Float selection feedback popup info */}
            {selectedPin && (
              <div className="absolute top-4 inset-x-4 bg-slate-900 border-2 border-blue-500/30 shadow-2xl p-4 rounded-2xl text-left text-xs animate-fade-in space-y-2">
                <div className="flex justify-between items-center font-bold text-white leading-none">
                  <span className="flex items-center gap-1.5"><Info className="h-4 w-4 text-blue-400" /> {selectedPin.title}</span>
                  <button onClick={() => setSelectedPin(null)} className="text-slate-400 hover:text-slate-200 text-sm font-mono cursor-pointer px-1">✕</button>
                </div>
                <p className="text-slate-300 font-sans leading-normal">{selectedPin.desc}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Coordinates: {selectedPin.lat.toFixed(6)}, {selectedPin.lng.toFixed(6)}
                </div>
              </div>
            )}

          </div>

          {/* ADD GPS LOCATION MARKER SIMULATOR WIDGET */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <Plus className="h-4 w-4 text-blue-400" />
              <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">Simulate Ride Path Generation</h4>
            </div>

            <form onSubmit={handleSimulateGPSAddition} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">latitude</label>
                <input
                  type="text"
                  required
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">longitude</label>
                <input
                  type="text"
                  required
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">speed (km/h)</label>
                <input
                  type="number"
                  required
                  value={customSpeed}
                  onChange={(e) => setCustomSpeed(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSpawning}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer shadow shadow-blue-900/10"
              >
                {isSpawning ? "Injecting..." : "Inject Path Point"}
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: PATH TIMELINE & ALERTS HISTORY HIGHLIGHT */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* Timeline segment */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl h-[470px] flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-400" />
                Continuous Track History
              </h3>
              <p className="text-xs text-slate-400">Breadcrumbs saved sequentially into persistent state.</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-3">
              {logsSorted.map((loc, idx) => {
                const stepTime = new Date(loc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                return (
                  <div key={idx} className="flex gap-3 text-xs group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 border ${
                        idx === 0 ? 'bg-emerald-500 border-emerald-400 animate-pulse' : 'bg-blue-950 border-blue-500/40'
                      }`} />
                      <div className="w-0.5 flex-1 bg-slate-850 mt-1" />
                    </div>
                    <div className="flex-1 space-y-0.5 pb-2 border-b border-slate-950/20">
                      <div className="flex justify-between font-mono text-[10px] text-slate-500">
                        <span>{stepTime}</span>
                        <span className="text-blue-400 font-bold">{loc.speed} km/h</span>
                      </div>
                      <div className="font-mono text-slate-300 font-bold font-semibold text-xs flex justify-between items-center">
                        <span>{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</span>
                        <button 
                          onClick={() => {
                            setCustomLat(loc.lat.toFixed(6));
                            setCustomLng(loc.lng.toFixed(6));
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 hover:underline transition-opacity font-sans"
                        >
                          Use ↰
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {logsSorted.length === 0 && (
                <div className="text-center text-slate-500 py-20 text-xs italic">
                  No telemetry coordinate logs yet.
                </div>
              )}
            </div>

            <div className="flex gap-3 items-center pt-2 border-t border-slate-950/40">
              <button
                onClick={handleResetHistory}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                Clear Notifications Logs
              </button>
              <span className="text-slate-700 font-mono text-xs">|</span>
              <div className="text-slate-500 text-[10px] font-mono leading-relaxed flex-1">
                ⚙️ Status: Signal Lock Multi-Sat ({locationHistory.length} nodes)
              </div>
            </div>
          </div>

          {/* Emergency coordinates highlight helper box */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <Siren className="h-4.5 w-4.5 text-red-400" />
              Incident Coordinates Selector
            </h4>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Click on any registered incident location to jump coordinates on map grid or check historical factors.
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {accidentLogs.map((log) => {
                const isUrgent = log.status === "Pending" || log.status === "Help Sent";
                return (
                  <div 
                    key={log.accidentId}
                    onClick={() => {
                      setCustomLat(log.lat.toFixed(6));
                      setCustomLng(log.lng.toFixed(6));
                      setSelectedPin({
                        lat: log.lat,
                        lng: log.lng,
                        title: `Incident Code Log: ${log.accidentId.substring(4, 9)}`,
                        desc: `Identified severe force with state: ${log.status}. Generated Maps telemetry sent to emergency coordinators.`
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left cursor-pointer transition-all flex justify-between items-center ${
                      isUrgent 
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[10px] text-slate-500 uppercase font-black">
                        #{log.accidentId.substring(4,9)} • {log.severityPrediction}
                      </div>
                      <span className="text-slate-200 text-[11px] font-mono mt-0.5 block">
                        Lat: {log.lat.toFixed(4)}, Lng: {log.lng.toFixed(4)}
                      </span>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${isUrgent ? 'text-rose-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}

              {accidentLogs.length === 0 && (
                <div className="text-center py-4 bg-slate-950/10 border border-dashed border-slate-850 rounded-xl text-slate-600 text-xs">
                  No registered incidents reported.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
