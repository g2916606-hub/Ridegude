import { motion } from "motion/react";
import { Shield, Key, HeartPulse, Cpu, Radio, ChevronRight, Activity, Award } from "lucide-react";

interface HomeViewProps {
  onNavigate: (page: string) => void;
  sensorData: any;
}

export default function HomeView({ onNavigate, sensorData }: HomeViewProps) {
  return (
    <div className="space-y-16 py-4 animate-fade-in text-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-radial from-slate-900 via-slate-950 to-black px-6 py-16 text-center border border-slate-800 md:px-12 md:py-24 hover:border-blue-900/40 transition-colors">
        {/* Decorative Grid Network Background */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#0ea5e9,transparent_1px),linear-gradient(to_bottom,#0ea5e9,transparent_1px)] bg-[size:30px_30px]" />
        
        {/* Glow Spheres */}
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-emerald-500/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-950/40 px-4 py-1.5 text-sm text-blue-400 backdrop-blur-md"
          >
            <Activity className="h-4 w-4 animate-pulse text-blue-500" />
            Empowering Two-Wheeler Safety with Next-Gen AI & IoT
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-sans text-4xl font-extrabold tracking-tight sm:text-6xl text-white"
          >
            Ride Safe. Guard Lives. <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Introducing RideGuard+
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto max-w-2xl text-base text-gray-400 sm:text-lg leading-relaxed"
          >
            A high-performance safety platform connecting a micro-sensor mesh helmet (ESP32) 
            with modern ambient machine learning. Prevent DUI starts, track rider locations in real-time, 
            and count on automated immediate SOS workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
          >
            <button
              onClick={() => onNavigate("dashboard")}
              className="group relative flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-500 hover:scale-[1.02] shadow-blue-900/30 w-full sm:w-auto text-center justify-center cursor-pointer"
            >
              Launch Live Dashboard
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onNavigate("features")}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-gray-300 transition-all w-full sm:w-auto text-center justify-center cursor-pointer"
            >
              Explore Intelligent Features
            </button>
          </motion.div>
        </div>

        {/* Coded SVG Smart Helmet Schematic Rendering */}
        <div className="mt-16 relative flex justify-center items-center">
          <div className="absolute inset-0 bg-radial from-blue-600/10 to-transparent blur-3xl rounded-full" />
          <svg className="w-64 h-64 md:w-80 md:h-80 text-blue-500" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer Helmet Ring */}
            <circle cx="100" cy="100" r="94" stroke="#1e293b" strokeWidth="2" strokeDasharray="3 3" />
            
            {/* Main Outer Shield */}
            <path d="M100 25 C145 25 175 60 175 105 C175 110 170 120 162 120 C155 120 152 110 148 105 C140 95 125 90 100 90 C75 90 60 95 52 105 C48 110 45 120 38 120 C30 120 25 110 25 105 C25 60 55 25 100 25 Z" fill="url(#helmetGrad)" stroke="#3b82f6" strokeWidth="3" opacity="0.9" />
            
            {/* Helmet Visor Gloss */}
            <path d="M45 70 C70 52 130 52 155 70 C165 78 160 92 148 92 C125 92 75 92 52 92 C40 92 35 78 45 70 Z" fill="#0f172a" stroke="#60a5fa" strokeWidth="2" />
            <path d="M55 72 C80 60 120 60 145 72" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />

            {/* Smart Hardware Node Points */}
            {/* MQ Alcohol Sensor Node */}
            <circle cx="152" cy="105" r="5" fill="#f59e0b" className="animate-ping" style={{ animationDuration: '4s' }} />
            <circle cx="152" cy="105" r="3.5" fill="#f59e0b" />
            <line x1="152" y1="105" x2="210" y2="105" stroke="#475569" strokeWidth="1" />
            <text x="215" y="108" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">MQ Alcohol Sensor</text>

            {/* MPU6050 Gyro Accelerator Node */}
            <circle cx="100" cy="50" r="5" fill="#3b82f6" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="100" cy="50" r="3.5" fill="#06b6d4" />
            <line x1="100" y1="50" x2="100" y2="10" stroke="#475569" strokeWidth="1" />
            <text x="100" y="5" fill="#94a3b8" fontSize="6.5" textAnchor="middle" fontFamily="monospace">MPU6050 Gyro/Accel (Accident Detect)</text>

            {/* Wear Sensor InfraRed */}
            <circle cx="100" cy="80" r="4.5" fill="#10b981" />
            <text x="100" y="75" fill="#10b981" fontSize="6" textAnchor="middle" fontFamily="monospace">IR Worn Detector</text>

            {/* GPS Module + Battery status */}
            <circle cx="48" cy="105" r="5" fill="#10b981" className="animate-ping" style={{ animationDuration: '5s' }} />
            <circle cx="48" cy="105" r="3.5" fill="#10b981" />
            <line x1="48" y1="105" x2="-5" y2="105" stroke="#475569" strokeWidth="1" />
            <text x="-10" y="108" fill="#94a3b8" fontSize="6.5" textAnchor="end" fontFamily="monospace">GPS Tracking & Power Management</text>

            <defs>
              <linearGradient id="helmetGrad" x1="100" y1="25" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Status badge in bottom corner of vector */}
          <div className="absolute bottom-4 border border-blue-500/20 bg-slate-900/90 rounded-lg p-2.5 backdrop-blur text-left">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-mono">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${sensorData.deviceOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              Hardware Link
            </div>
            <div className="text-sm font-semibold text-gray-200 font-mono mt-0.5">
              ESP32: {sensorData.deviceOnline ? "Connected" : "Offline"}
            </div>
          </div>
        </div>
      </section>

      {/* Safety Statistics Grid */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight md:text-3xl">Safety by the Numbers</h2>
          <p className="text-slate-400 text-sm mt-1">Why active safety platforms are critical for every rider</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center hover:border-slate-700/60 transition-colors">
            <div className="text-blue-500 text-3xl font-extrabold font-mono tracking-tight sm:text-4xl">80%</div>
            <div className="text-slate-300 font-medium text-sm mt-2">Accident Fatality Reduction</div>
            <p className="text-xs text-slate-500 mt-1">When structured helmets are worn securely and correct speed margins are managed.</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center hover:border-slate-700/60 transition-colors">
            <div className="text-amber-500 text-3xl font-extrabold font-mono tracking-tight sm:text-4xl">15s</div>
            <div className="text-slate-300 font-medium text-sm mt-2">SOS Fallback Sequence</div>
            <p className="text-xs text-slate-500 mt-1">Instant telemetry alerts with Google Maps coordinates are dispatched if rider is unresponsive.</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl text-center hover:border-slate-700/60 transition-colors">
            <div className="text-emerald-500 text-3xl font-extrabold font-mono tracking-tight sm:text-4xl">100%</div>
            <div className="text-slate-300 font-medium text-sm mt-2">DUI Prevention Guard</div>
            <p className="text-xs text-slate-500 mt-1">Active MQ analyzer guarantees engine start block when sensor threshold is reached.</p>
          </div>
        </div>
      </section>

      {/* Key Project Benefits */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-block rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            Next-Gen Architecture
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Preventive Safety vs. Post-Crash Response</h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            Old-school helmets only protect you during physical impacts. RideGuard+ turns the helmet into a proactive 
            safety partner. By continuous monitoring, we provide security layers both before starting your ride and when 
            road conditions degrade.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <dt className="text-sm font-semibold text-white">Triple Sensing Matrix</dt>
                <dd className="text-xs text-slate-400 mt-0.5">MQ sensor, accelerometer array, and IR worn validation ensure active vigilance.</dd>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <dt className="text-sm font-semibold text-white">Machine Learning Severity Prediction</dt>
                <dd className="text-xs text-slate-400 mt-0.5">Gemini parses gyroscope signals in real-time to analyze and grade crash impact forces.</dd>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <dt className="text-sm font-semibold text-white">Robust Offline Fallback Alerting</dt>
                <dd className="text-xs text-slate-400 mt-0.5">Predefined emergency contacts are stored securely on Firestore to send instantly via APIs during crashes.</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
            <Cpu className="h-6 w-6 text-sky-400" />
            <h4 className="font-semibold text-gray-200 text-sm">ESP32 Core Microprocessor</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Continuous 10-Hz sample cycle for reliable response and hardware buzzer alerts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
            <Key className="h-6 w-6 text-emerald-400" />
            <h4 className="font-semibold text-gray-200 text-sm">DUI MQ Ignition Lock</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Hard stop on starter circuit relays if MQ-3 air samples register elevated values.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
            <Radio className="h-6 w-6 text-orange-400" />
            <h4 className="font-semibold text-gray-200 text-sm">GPS Breadcrumbs Link</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Logs actual route data directly, helping first responders locate the exact grid reference.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
            <Award className="h-6 w-6 text-blue-400" />
            <h4 className="font-semibold text-gray-200 text-sm">AI Severity Prediction</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Calculates critical incident priority levels via server-side Google GenAI predictions.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 pt-8 mt-16 text-center text-slate-500">
        <div className="flex justify-center items-center gap-2 text-sm font-semibold text-slate-300">
          <Shield className="h-5 w-5 text-blue-500" />
          <span>RideGuard+ Smart System Co.</span>
        </div>
        <p className="text-xs mt-2 max-w-md mx-auto text-slate-400">
          Providing high-availability client telemetry services since 2026. Keep safety activated, keep systems online.
        </p>
        <p className="text-[11px] mt-4 font-mono">
          System Port Link: ONLINE // Local Dev Environment Standard Port 3000
        </p>
      </footer>
    </div>
  );
}
