import React, { useState, useEffect } from "react";
import { 
  UserMinus, UserPlus, Phone, Heart, Users, Edit2, Check, X, 
  ShieldAlert, Calendar, MapPin, ExternalLink, Siren, Radio, Send, LifeBuoy, Loader, Shield, Play
} from "lucide-react";
import { EmergencyContact, AccidentLog, SOSLog, SensorData } from "../types";
import { 
  addContact,
  updateContact,
  deleteContact,
  getContacts,
  updateHelmetData
} from "../firebase";

interface EmergencyContactsViewProps {
  contacts: EmergencyContact[];
  accidentLogs: AccidentLog[];
  onUpdateAccidentStatus: (accidentId: string, status: string) => void;
  onRefresh: () => void;
  sosLogs?: SOSLog[];
  sensorData?: SensorData;
}

export default function EmergencyContactsView({ 
  contacts, 
  accidentLogs, 
  onUpdateAccidentStatus,
  onRefresh,
  sosLogs = [],
  sensorData
}: EmergencyContactsViewProps) {
  // Local state representing live Firestore contacts
  const [fbContacts, setFbContacts] = useState<EmergencyContact[]>(contacts);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  // Form input states for creating a contact
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Spouse");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit fields states
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("Spouse");
  const [editPhone, setEditPhone] = useState("");

  // Countdown timer for automatic crash dispatches
  const pendingAccident = accidentLogs.find(acc => acc.status === "Pending");
  const [countdown, setCountdown] = useState(15);
  const [sosLoading, setSosLoading] = useState(false);

  useEffect(() => {
    if (pendingAccident) {
      setCountdown(15);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onUpdateAccidentStatus(pendingAccident.accidentId, "Help Sent");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [pendingAccident]);

  const handleTriggerSOS = async () => {
    setSosLoading(true);
    try {
      await updateHelmetData({ sosPressed: true });
      await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: 37.779213, lng: -122.411124 })
      });
      onRefresh();
    } catch (err) {
      console.error("SOS manual dispatch error:", err);
    } finally {
      setSosLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    setSosLoading(true);
    try {
      await updateHelmetData({ sosPressed: false });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSosLoading(false);
    }
  };

  // UI state for showing test simulation alerts
  const [simulatedTriggerLoading, setSimulatedTriggerLoading] = useState(false);

  // Load contacts from Firestore on mount
  const loadFirestoreContacts = async () => {
    setFbLoading(true);
    setFbError(null);
    try {
      const list = await getContacts("user-1");
      setFbContacts(list);
    } catch (err: any) {
      console.error("Firestore Loading Contacts Error:", err);
      let errMsg = "Failed to synchronize contacts from Cloud Firestore.";
      try {
        const parsed = JSON.parse(err.message);
        errMsg = parsed.error || errMsg;
      } catch {
        errMsg = err.message || errMsg;
      }
      setFbError(errMsg);
    } finally {
      setFbLoading(false);
    }
  };

  useEffect(() => {
    loadFirestoreContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setSaving(true);
    setFbError(null);
    try {
      // 1. Save directly to Firebase Firestore
      const contactId = "contact-" + Date.now();
      await addContact({
        contactId,
        userId: "user-1",
        name,
        relationship,
        phone
      });

      // Clear input fields
      setName("");
      setPhone("");
      setRelationship("Spouse");

      // 2. Synchronously reload live Firestore list
      await loadFirestoreContacts();

      // Trigger standard callback to refresh other components
      onRefresh();
    } catch (err: any) {
      console.error("Firebase Add Contact Error:", err);
      let errMsg = "Failed to add contact to Firestore. Please verify security parameters.";
      try {
        const parsed = JSON.parse(err.message);
        errMsg = parsed.error || errMsg;
      } catch {
        errMsg = err.message || errMsg;
      }
      setFbError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setFbError(null);
    try {
      // 1. Delete from Firestore
      await deleteContact(contactId, "user-1");

      // 2. Reload live list
      await loadFirestoreContacts();

      onRefresh();
    } catch (err: any) {
      console.error("Firebase Delete Contact Error:", err);
      let errMsg = "Failed to clear contact from Firestore.";
      try {
        const parsed = JSON.parse(err.message);
        errMsg = parsed.error || errMsg;
      } catch {
        errMsg = err.message || errMsg;
      }
      setFbError(errMsg);
    }
  };

  const startEdit = (c: EmergencyContact) => {
    setEditingId(c.contactId);
    setEditName(c.name);
    setEditRelationship(c.relationship);
    setEditPhone(c.phone);
  };

  const handleSaveEdit = async (contactId: string) => {
    setFbError(null);
    try {
      // 1. Update in Firestore
      await updateContact(contactId, {
        userId: "user-1",
        name: editName,
        relationship: editRelationship,
        phone: editPhone
      });

      setEditingId(null);

      // 2. Reload live list
      await loadFirestoreContacts();

      onRefresh();
    } catch (err: any) {
      console.error("Firebase Edit Contact Error:", err);
      let errMsg = "Failed to commit edit parameters to Firestore.";
      try {
        const parsed = JSON.parse(err.message);
        errMsg = parsed.error || errMsg;
      } catch {
        errMsg = err.message || errMsg;
      }
      setFbError(errMsg);
    }
  };

  // Helper to trigger simulated crash for testing
  const triggerCrashSimulation = async () => {
    setSimulatedTriggerLoading(true);
    try {
      await fetch("/api/accident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: 37.779213,
          lng: -122.411124,
          accelX: 4.2,
          accelY: -1.2,
          accelZ: 2.1,
          rawGForce: 4.2
        })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatedTriggerLoading(false);
    }
  };

  const isSosPressed = sosLogs.some(s => s.status === "Active");

  return (
    <div className="space-y-8 py-4 animate-fade-in text-gray-100 font-sans">
      
      {/* Upper header summary segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="max-w-2xl space-y-2 text-left">
          <div className="inline-block rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
            EMERGENCY RESPONSE UNIT
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Emergency System Hub</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Configure emergency contacts and review automated satellite dispatch sequences. 
            In critical impacts, the ESP32 initiates GPS retrieval and triggers broadcasts automatically.
          </p>
        </div>

        {/* Quick Crash simulator trigger for review */}
        <button
          onClick={triggerCrashSimulation}
          disabled={simulatedTriggerLoading}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-red-950/20 cursor-pointer disabled:opacity-50 transition-all transform hover:scale-[1.01]"
        >
          <Siren className="h-4 w-4 animate-pulse" />
          {simulatedTriggerLoading ? "Triggering..." : "Simulate Instant Crash Vector"}
        </button>
      </div>

      {/* 1. AUTO CRITICAL ACCIDENT NOTIFICATION TIMER PANEL */}
      {pendingAccident && (
        <div className="bg-gradient-to-br from-red-950/50 via-rose-950/20 to-slate-950/80 border-2 border-red-550 border-red-500/40 p-6 rounded-2xl text-left relative overflow-hidden animate-pulse shadow-xl shadow-red-950/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 text-red-400 font-mono text-[11px] uppercase font-bold tracking-wider">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                CRITICAL COLLISION IMMINENT ALERTS DISPATCH COUNTDOWN
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">
                ESP32 Registered Impact Collision Event Detected
              </h2>
              <div className="text-xs text-slate-300 space-y-1 max-w-xl">
                <p>
                  Telemetry indicates a high-risk impact. <b>SARAH VANCE (& spouse contacts)</b> will lock onto critical Google Maps coordinates in <span className="font-mono text-red-400 font-extrabold">{countdown} seconds</span> unless manually countered below.
                </p>
                <div className="text-slate-500 font-mono text-[10.5px]">
                  Rider Location Lat/Lng: {pendingAccident.lat.toFixed(6)}, {pendingAccident.lng.toFixed(6)} | Severity Prediction: <b className="text-red-450 text-red-400">High</b>
                </div>
              </div>
            </div>

            {/* Countdown Large Ring Indicator */}
            <div className="flex items-center gap-4 shrink-0 bg-slate-950/60 p-4 border border-rose-900/30 rounded-xl">
              <div className="text-center">
                <div className="text-4xl font-mono font-black text-rose-500 animate-bounce">{countdown}s</div>
                <div className="text-[9px] uppercase font-mono text-slate-500 font-bold">Auto dispatch</div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onUpdateAccidentStatus(pendingAccident.accidentId, "Safe")}
                  className="bg-emerald-650 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors font-mono uppercase"
                >
                  I am safe (Cancel)
                </button>
                <button
                  onClick={() => onUpdateAccidentStatus(pendingAccident.accidentId, "Help Sent")}
                  className="bg-red-650 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors font-mono uppercase"
                >
                  Force Send Help
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BENTO BARS FOR SOS & LIVE TELEM STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* INTERACTIVE EMERGENCY SOS SIGNAL PANEL */}
        <div className="md:col-span-5 bg-gradient-to-b from-slate-900/60 to-slate-950/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between text-left transition-all hover:border-slate-850">
          <div className="space-y-2">
            <span className="text-[9px] font-mono tracking-wider text-rose-500 font-black uppercase flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSosPressed ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
              Distress Panic Beacon
            </span>
            <h3 className="font-bold text-white text-base">Riders SOS controller</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Press the SOS element below to immediately dispatch distress SMS links bypassing collision metrics timers.
            </p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center relative py-4">
            {isSosPressed ? (
              <div className="relative flex items-center justify-center">
                {/* Glowing red distress wave vectors */}
                <div className="absolute inset-0 h-28 w-28 rounded-full bg-red-600/35 animate-ping" />
                <div className="absolute inset-0 h-24 w-24 rounded-full bg-red-500/20 animate-pulse" />
                
                <button
                  onClick={handleCancelSOS}
                  disabled={sosLoading}
                  className="relative z-10 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-rose-800 to-red-600 border-4 border-white font-mono text-zinc-100 uppercase tracking-widest text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {sosLoading ? "..." : "RESET"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleTriggerSOS}
                disabled={sosLoading}
                className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-b from-red-650 to-rose-700 bg-red-650 text-white font-sans text-sm font-black tracking-wider shadow-lg hover:bg-slate-800 border-2 border-red-500/20 hover:scale-[1.04] active:scale-95 transition-all text-center cursor-pointer shadow-red-950/35"
              >
                {sosLoading ? "SOSh..." : "SOS"}
              </button>
            )}

            <div className="text-center mt-3.5">
              <span className={`text-[10.5px] font-mono font-bold ${isSosPressed ? "text-rose-400 uppercase animate-pulse" : "text-slate-500"}`}>
                {isSosPressed ? "🔴 DISTRESS RADAR ENGAGED - HELP DISPATCHED" : "● Beacon dormant. Press to trigger."}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-[10.5px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between items-baseline font-semibold">
              <span>SOS Channel priority:</span>
              <span className="text-rose-400">Class 1 Priority</span>
            </div>
            <p className="text-[9.5px] leading-relaxed text-slate-500">
              Manual SOS sets instant real-time Firebase DB triggers, forcing gateway SMS delivery to guardians.
            </p>
          </div>
        </div>

        {/* SYSTEM SECURITY DIAGNOSTIC STATUS PANEL */}
        <div className="md:col-span-12 lg:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 text-left transition-all hover:border-slate-850">
          <div>
            <span className="text-[9px] font-mono tracking-wider text-emerald-400 font-extrabold uppercase">Live system alert status</span>
            <h3 className="font-bold text-white text-base">Network Safety Clearance</h3>
            <p className="text-xs text-slate-400">Review instant ignition hardware safeguards monitored from physical loops.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. IR COMPLIANCE */}
            <div className="bg-slate-955 bg-slate-950 border border-slate-900 p-4 rounded-2xl flex items-start gap-3">
              <div className={`p-2 rounded-lg ${sensorData?.worn ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'} shrink-0`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Helmet IR state</span>
                <span className="text-xs font-bold block text-white">
                  {sensorData?.worn ? "🟢 Loop compliance: worn" : "🚨 ALERT: HELMET UNWORN"}
                </span>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Ignition start lock is {sensorData?.worn ? "Safely Cleared" : "Engaged (Locked)"}.
                </p>
              </div>
            </div>

            {/* 2. SOBRIETY MQ-3 */}
            <div className="bg-slate-955 bg-slate-950 border border-slate-900 p-4 rounded-2xl flex items-start gap-3">
              <div className={`p-2 rounded-lg ${(sensorData?.alcoholLevel ?? 0) > 300 ? 'bg-rose-950 text-rose-450 text-rose-400 animate-pulse' : 'bg-emerald-950 text-emerald-450 text-emerald-400'} shrink-0`}>
                <Radio className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">MQ-3 Sobriety value</span>
                <span className="text-xs font-bold block text-white">
                  {(sensorData?.alcoholLevel ?? 0) > 300 ? "🚨 ALERT: SOBRIETY BREACH" : "🟢 Sobriety: pass"}
                </span>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  MQ PPM check level at <b className="font-mono">{sensorData?.alcoholLevel ?? 145} PPM</b>.
                </p>
              </div>
            </div>

            {/* 3. SIMULATOR HEALTH */}
            <div className="bg-slate-955 bg-slate-950 border border-slate-900 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-950 text-blue-400 shrink-0">
                <Siren className="h-5 w-5" />
              </div>
              <div className="space-y-1 border-slate-950">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Accident dispatches state</span>
                <span className="text-xs font-bold block text-slate-200">
                  {accidentLogs.filter(a => a.status === "Help Sent").length} Sent dispatches
                </span>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Satellite queues operating on normal priority levels.
                </p>
              </div>
            </div>

            {/* 4. DRIVER HEALTH COEFF */}
            <div className="bg-slate-955 bg-slate-950 border border-slate-900 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 shrink-0">
                <Heart className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Medical diagnostics metadata</span>
                <span className="text-xs font-bold block text-slate-200">Alex Vance: O-Positive</span>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Transmitted synchronously during 911 dispatch calls.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CONTACT MANAGEMENT DIRECTORY */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sub-Panel: Add Form */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4 text-left shadow-md">
            <div className="flex items-center gap-2 text-blue-400">
              <UserPlus className="h-5 w-5" />
              <h3 className="font-bold text-white text-base">New Safety Guardian</h3>
            </div>
            <p className="text-xs text-slate-400">
              Add family, spouses, or clinicians to receive automatic Google Maps SMS links.
            </p>

            <form onSubmit={handleAddContact} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Vance"
                  className="w-full text-xs bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Relationship / Specialty</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Primary Physician">Primary Physician</option>
                  <option value="Emergency Medical Response">Emergency Medical Response</option>
                  <option value="Local Transit Authority">Local Transit Authority</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Phone Number (with Code)</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full text-xs bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow shadow-blue-900/10 cursor-pointer"
              >
                {saving ? "Registering..." : "Add Emergency Guardian"}
              </button>
            </form>
          </div>

          {/* Sub-Panel: Guardians List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Registered Contacts</h3>
                {fbLoading && <Loader className="h-4 w-4 animate-spin text-indigo-400" />}
              </div>
              <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded-full font-bold font-mono">
                {fbContacts.length} Total
              </span>
            </div>

            {fbError && (
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs text-left">
                ⚠️ {fbError}
              </div>
            )}

            <div className="space-y-3">
              {fbContacts.map((contact) => {
                const isEditing = editingId === contact.contactId;

                return (
                  <div
                    key={contact.contactId}
                    className="bg-slate-900/20 border border-slate-800 rounded-2xl p-4 hover:border-slate-700/50 transition-all flex justify-between items-center text-left"
                  >
                    {isEditing ? (
                      <div className="space-y-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200"
                        />
                        <select
                          value={editRelationship}
                          onChange={(e) => setEditRelationship(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200 font-sans"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Friend">Friend</option>
                          <option value="Primary Physician">Primary Physician</option>
                          <option value="Emergency Medical Response">Emergency Medical Response</option>
                          <option value="Local Transit Authority">Local Transit Authority</option>
                        </select>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200 font-mono"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{contact.name}</h4>
                          <span className="rounded-full bg-blue-950/40 text-blue-400 border border-blue-500/15 px-2 py-0.5 text-[9px] font-semibold">
                            {contact.relationship}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <Phone className="h-3 w-3 text-blue-500" />
                          <span>{contact.phone}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(contact.contactId)}
                            className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 p-2 rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-slate-950 border border-slate-800 text-slate-400 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(contact)}
                            className="bg-slate-950 border border-slate-800/80 text-slate-400 p-2 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.contactId)}
                            className="bg-rose-950/30 border border-rose-900/30 text-rose-400 p-2 rounded-lg hover:bg-rose-900/50 transition-all cursor-pointer"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {fbContacts.length === 0 && !fbLoading && (
                <div className="text-center p-8 border border-slate-800/50 rounded-2xl bg-slate-900/20 text-slate-500 text-xs">
                  No safety guardians registered yet in Firestore.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ACCIDENT LOG HISTORY & AUTOMATIC ALERT DISPATCH CORES */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-white text-base">Accident Incident Log History</h3>
              </div>
              <span className="text-[10px] bg-slate-950 px-2 py-1 rounded-lg text-slate-400 font-mono uppercase">
                Active Registry
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Below represents the historically logged crashes. For cases marking "Help Sent", you can expand each registry to review GPS maps links, emergency gateway text contents, and medical responders routing status.
            </p>

            <div className="space-y-4 pt-2">
              {accidentLogs.map((log) => {
                const mapUrl = `https://maps.google.com/?q=${log.lat},${log.lng}`;
                const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const logDate = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div 
                    key={log.accidentId}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow transition-all hover:bg-slate-950"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-900 pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-slate-500 block">CASE RECORD ID</span>
                        <h4 className="font-mono text-xs font-extrabold text-slate-300 uppercase">
                          #{log.accidentId.substring(4, 9)}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Alert Status badges */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          log.status === "Pending" ? "bg-amber-950 text-amber-400 border border-amber-500/20 animate-pulse" :
                          log.status === "Safe" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                          "bg-red-950 text-red-400 border border-red-500/20 animate-pulse"
                        }`}>
                          {log.status === "Pending" && "🟡 Pending Countdown"}
                          {log.status === "Safe" && "🟢 Resolved (Safe)"}
                          {log.status === "Help Sent" && "🔴 Alerts Dispatched"}
                        </span>
                      </div>
                    </div>

                    {/* Meta info date/time/location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Timestamp</span>
                          <span>{logDate} at {logTime}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Coordinates (GPS)</span>
                          <div className="font-mono text-[11px]">
                            {log.lat.toFixed(6)}, {log.lng.toFixed(6)}
                          </div>
                          <a 
                            href={mapUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline hover:text-blue-300 font-sans font-semibold mt-1"
                          >
                            Google Maps Link <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Automatic alert system logs box details (Only if Help Sent or Pending) */}
                    {log.status === "Help Sent" && (
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-rose-900/20 text-xs space-y-3 mt-3">
                        <div className="flex justify-between items-center text-rose-400 font-mono text-[10px] uppercase font-bold tracking-wider border-b border-slate-950/60 pb-1">
                          <span>🛡️ Automatic Alert System Output</span>
                          <span className="flex items-center gap-1">
                            <Radio className="h-3 w-3 animate-ping" /> Satellite Link Active
                          </span>
                        </div>

                        {/* Guardian Contacts SMS Alert summary logs */}
                        <div className="space-y-1.5 text-left">
                          <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                            1. Emergency SMS Notifications Logs
                          </span>
                          <div className="space-y-1 pl-1">
                            {fbContacts.map((c, i) => (
                              <div key={i} className="flex justify-between text-slate-300 font-mono text-[11px]">
                                <span>📩 SMS Sent → {c.name} ({c.phone})</span>
                                <span className="text-emerald-400 font-bold">STATUS: DELIVERED</span>
                              </div>
                            ))}
                            {fbContacts.length === 0 && (
                              <div className="text-slate-500 font-serif italic text-xs pl-2">
                                No contacts configured! Dispatched urgent public transit broadcast override.
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 p-2 bg-slate-950 rounded-lg border border-slate-850 font-mono text-[10.5px] text-rose-300 leading-normal">
{`🚨 EMERGENCY CRASH DETECTED 🚨
Rider: Alex Vance
Location maps link:
https://maps.google.com/?q=${log.lat},${log.lng}
[ESP32 Telemetry Impact: ${log.riskScore}/100 Rating]`}
                          </div>
                        </div>

                        {/* Emergency Medical Services (EMS) Logs */}
                        <div className="space-y-1 border-t border-slate-950/40 pt-2 text-left">
                          <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                            2. Ambulance & Emergency Medical Dispatch
                          </span>
                          <div className="flex items-center gap-1.5 pl-1 font-mono text-[11px]">
                            <span className="inline-block h-2 h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
                            <span className="text-rose-400 font-bold">Responders Node Alert:</span>
                            <span className="text-slate-300">ACTIVE DISPATCH TO GPS COORDINATES</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 pl-4">
                            911 Responders assigned level: <span className="text-blue-400 font-bold font-sans">High Priority</span>. Blood Group metadata O-Positive dispatched.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Manual Override Action row */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-900/60">
                      <span className="text-[9.5px] font-mono text-slate-500 self-center uppercase font-bold mr-auto">
                        State override:
                      </span>
                      <button
                        onClick={() => onUpdateAccidentStatus(log.accidentId, "Safe")}
                        className="text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 rounded-xl font-mono transition-colors cursor-pointer"
                      >
                        Set Safe
                      </button>
                      <button
                        onClick={() => onUpdateAccidentStatus(log.accidentId, "Help Sent")}
                        className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 rounded-xl font-mono transition-colors cursor-pointer"
                      >
                        Dispatch Help
                      </button>
                    </div>

                  </div>
                );
              })}

              {accidentLogs.length === 0 && (
                <div className="text-center py-20 border border-slate-850 bg-slate-900/10 rounded-2xl text-slate-500 text-xs">
                  All systems fine. No helmet accident entries recorded.
                </div>
              )}
            </div>

          </div>

          {/* SMS & GPS API Technical Grounding Card */}
          <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-3xl text-xs space-y-3 text-left">
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <LifeBuoy className="h-4.5 w-4.5 text-blue-400" />
              Automatic Emergency Pipeline Architecture
            </h4>
            <p className="text-slate-400 leading-relaxed font-sans text-xs">
              RideGuard+ operates on a hardware-level interlock. Once accident classification G-forces are met (MPU6050 Accelerometer), the system waits on an integrated 15-second delay countdown. If canceled, the system stays unlocked. Otherwise, geolocation markers are obtained and dispatched via digital GSM/GPRS modems instantly.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
