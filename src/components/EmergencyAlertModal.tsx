import React, { useState, useEffect, useRef } from "react";
import { AlertOctagon, ShieldAlert, HeartHandshake, PhoneCall, HelpCircle, Navigation } from "lucide-react";
import { AccidentLog, EmergencyContact } from "../types";

interface EmergencyAlertModalProps {
  accident: AccidentLog;
  contacts: EmergencyContact[];
  onIsSafe: () => void;
  onSendHelp: () => void;
}

export default function EmergencyAlertModal({
  accident,
  contacts,
  onIsSafe,
  onSendHelp
}: EmergencyAlertModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(15);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play a warning beep sound programmatically
  const playBeep = (freq = 880, duration = 0.15) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored if browser block audio or unsupported
    }
  };

  // Reset timer on new accident
  useEffect(() => {
    setSecondsLeft(15);
  }, [accident.accidentId]);

  // Main countdown timer loop
  useEffect(() => {
    if (secondsLeft <= 0) {
      playBeep(440, 0.6); // low warning tone
      onSendHelp();
      return;
    }

    // Play warning sound every second - pitch increases as timer expires!
    const pitch = secondsLeft <= 5 ? 1200 : 880;
    const duration = secondsLeft <= 5 ? 0.25 : 0.15;
    playBeep(pitch, duration);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mapsLink = `https://maps.google.com/?q=${accident.lat},${accident.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      {/* Background Pulsing Red Warnings */}
      <div className="absolute inset-0 pointer-events-none bg-red-950/20 animate-pulse border-8 border-red-500/20" />

      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500 rounded-3xl p-6 md:p-8 shadow-2xl shadow-red-950/40 text-left space-y-6">
        {/* Header alert symbol */}
        <div className="flex gap-4 items-start pb-4 border-b border-slate-800">
          <div className="bg-red-500/20 text-red-400 p-3.5 rounded-2xl border border-red-500/30 shrink-0 animate-bounce">
            <AlertOctagon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-block rounded bg-red-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest">
              G-FORCE CRASH DETECTED
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none uppercase">
              Rider Down Incident Detected
            </h2>
            <p className="text-xs text-rose-300">
              Violent impact/deceleration force threshold registered on ESP32 sensor cluster.
            </p>
          </div>
        </div>

        {/* Big countdown visualization circular area */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <div className="relative flex items-center justify-center h-28 w-28">
            {/* Pulsing visual circles */}
            <div className="absolute inset-0 rounded-full border-4 border-red-500/10 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-red-500/20" />
            
            {/* SVG circle stroke representation index */}
            <svg className="absolute inset-0 h-full w-full rotate-[-90deg]">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="#1e293b"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="#ef4444"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - secondsLeft / 15)}
                className="transition-all duration-1000"
              />
            </svg>

            {/* Render Countdown Seconds Left */}
            <div className="z-10 font-mono text-4xl font-extrabold text-red-400">
              {secondsLeft}s
            </div>
          </div>
          <p className="text-rose-200/80 font-semibold text-center text-xs mt-3 select-none">
            AUTOMATIC ALERT ACTIVATES IN {secondsLeft} SECONDS
          </p>
        </div>

        {/* Location snapshot */}
        <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs">
          <div className="flex justify-between font-mono text-slate-500 text-[9px] uppercase">
            <span>Rider coordinates</span>
            <span className="text-blue-400 flex items-center gap-1">
              <Navigation className="h-3 w-3 animate-pulse" /> Live Tracker
            </span>
          </div>
          <div className="font-mono text-slate-300 font-bold flex justify-between items-center">
            <span>Lat: {accident.lat.toFixed(6)}, Lng: {accident.lng.toFixed(6)}</span>
            <a 
              href={mapsLink} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-400 hover:underline hover:text-blue-300 font-sans text-[11px] font-semibold"
            >
              Open Google Map ↗
            </a>
          </div>
          <div className="pt-2 border-t border-slate-850 text-slate-400 flex justify-between">
            <span>Severity Rank:</span>
            <span className="text-yellow-400 font-bold">{accident.severityPrediction}</span>
          </div>
        </div>

        {/* Target guardians to notify information */}
        <div className="space-y-1.5 text-xs text-left">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">GUARDIAN CONTACTS DIRECTORY</span>
          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
            {contacts.map((contact, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-950/20 px-3 py-1.5 rounded-lg border border-slate-800/40">
                <span className="text-slate-300 font-medium">{contact.name} ({contact.relationship})</span>
                <span className="text-slate-500 font-mono text-[11px] font-bold">{contact.phone}</span>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-slate-600 italic text-center py-2 font-sans text-xs">
                ⚠️ No emergency contacts registered! Dispatches default local transit alert only.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Cancel button: User is safe */}
          <button
            onClick={onIsSafe}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 font-extrabold text-xs py-3.5 px-4 transition-all hover:text-white cursor-pointer"
          >
            <HeartHandshake className="h-4.5 w-4.5 text-emerald-400" />
            I Am Safe (Cancel Alert)
          </button>

          {/* Trigger immediately button */}
          <button
            onClick={onSendHelp}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs py-3.5 px-4 shadow-lg shadow-red-950/35 cursor-pointer animate-pulse"
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            Send Help Immediately
          </button>
        </div>
      </div>
    </div>
  );
}
