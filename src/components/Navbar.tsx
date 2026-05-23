import { useState } from "react";
import { 
  Shield, Bell, Menu, X, Battery, Cpu, CheckCircle2, AlertTriangle, PlayCircle
} from "lucide-react";
import { Notification } from "../types";

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  notifications: Notification[];
  onClearNotifications: () => void;
  online: boolean;
  battery: number;
}

export default function Navbar({ 
  currentPage, onNavigate, notifications, onClearNotifications, online, battery 
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: "home", label: "Home" },
    { id: "features", label: "Core Modules" },
    { id: "dashboard", label: "Live Dashboard" },
    { id: "analytics", label: "Analytics Hub" },
    { id: "contacts", label: "Emergency Guardians" },
    { id: "map", label: "GIS Mapping" },
    { id: "admin", label: "Admin Console" },
    { id: "hardware", label: "ESP32 Firmware" }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand logo */}
        <div 
          onClick={() => onNavigate("home")} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 shadow shadow-blue-500/20 group-hover:scale-[1.04] transition-transform">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-sans font-extrabold tracking-tight text-white text-base">
            RideGuard<span className="text-blue-400 font-medium font-serif">+</span>
          </span>
        </div>

        {/* Desktop Tabs Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentPage === tab.id
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/45"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Action icons status */}
        <div className="flex items-center gap-3">
          
          {/* Active HW telemetry pill */}
          <div className="hidden lg:flex items-center gap-2 border border-slate-800/80 bg-slate-900/40 rounded-xl px-3 py-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <Cpu className={`h-3 w-3 ${online ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className={online ? 'text-emerald-400' : 'text-slate-400'}>
                {online ? "HW-LINK" : "HW-DISC"}
              </span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-1">
              <Battery className={`h-3.5 w-3.5 ${battery < 20 ? 'text-rose-500' : 'text-emerald-500'}`} />
              <span className="text-slate-300 font-bold">{battery}%</span>
            </div>
          </div>

          {/* Notifications alert button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl border border-slate-800/60 transition-colors cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Notification drop menu rendering */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl text-left backdrop-blur-md animate-fade-in divide-y divide-slate-800/50">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-200">System Bulletins</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearNotifications();
                        setShowNotifDropdown(false);
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      Clear Board
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto pt-2 space-y-2.5">
                  {notifications.map((n, i) => (
                    <div key={i} className="text-[11px] leading-normal text-slate-300">
                      <div className="flex justify-between font-mono text-[9px] text-slate-500 pb-0.5">
                        <span>
                          {n.type === "accident_detected" || n.type === "sos_triggered" ? "🚨 CRISIS" : "⚠️ GENERAL WARNING"}
                        </span>
                        <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p>{n.message}</p>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <p className="text-center text-slate-500 text-xs py-8 font-sans">
                      All systems operating within normal parameters.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu trigger toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-xl border border-slate-800/60 md:hidden cursor-pointer"
          >
            {isOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer tabs menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onNavigate(tab.id);
                setIsOpen(false);
              }}
              className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                currentPage === tab.id
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
