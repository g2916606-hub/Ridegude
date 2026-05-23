import { Shield, Flame, Compass, HeartPulse, Gauge, Disc, Zap, ShieldCheck } from "lucide-react";

export default function FeaturesView() {
  const list = [
    {
      id: "helmet",
      icon: <Shield className="h-8 w-8 text-blue-400" />,
      title: "Helmet Detection (InfraRed Sensor)",
      short: "Worn / Not Worn detection checking infrared head proximity.",
      tech: "IR Proximity Transmitter & Receiver (digital pin reads). Dispatches loud hardware buzzers if helmet is removed during travel.",
      impact: "Reduces head trauma risks on two-wheelers by up to 88% by enforcing pre-start protective compliance.",
      accent: "from-blue-600/20 to-transparent"
    },
    {
      id: "alcohol",
      icon: <Flame className="h-8 w-8 text-amber-400" />,
      title: "MQ Alcohol Detection Engine",
      short: "Automated engine start preventer based on blood alcohol PPM levels.",
      tech: "MQ-3 high sensitivity breath sensor. Triggers automatic ignition starter block if levels exceed 300 PPM.",
      impact: "Eliminates DUI danger proactively before the vehicle is even accelerated.",
      accent: "from-amber-600/20 to-transparent"
    },
    {
      id: "crash",
      icon: <Zap className="h-8 w-8 text-rose-500" />,
      title: "Crash Monitoring (MPU6050)",
      short: "Continuous G-force and gyroscope vector impact tracking.",
      tech: "MPU6050 6-DOF IMU. High-frequency decibel check detects sudden pitch flips, slips, or heavy deceleration peaks.",
      impact: "Immediate emergency sequence start with a fail-safe countdown to notify loved ones automatically during impacts.",
      accent: "from-rose-600/20 to-transparent"
    },
    {
      id: "gps",
      icon: <Compass className="h-8 w-8 text-emerald-400" />,
      title: "Real-time GPS Tracking",
      short: "Active telemetry coordinates and breadcrumbs route logging.",
      tech: "NEO-6M high-performance GPS receiver module. Pushes data coordinates directly via REST payloads.",
      impact: "Helps coordinates recovery, search teams, or friends to easily map active travels.",
      accent: "from-emerald-600/20 to-transparent"
    },
    {
      id: "sos",
      icon: <HeartPulse className="h-8 w-8 text-pink-500" />,
      title: "Immediate SOS Alerting",
      short: "One-click mechanical or digital button to dispatch help.",
      tech: "Mechanical tactile momentary switch configured on ESP32 digital pin with complete debounce logic.",
      impact: "Dispatches SMS/notifications with embedded maps link to all emergency contacts instantly.",
      accent: "from-pink-600/20 to-transparent"
    },
    {
      id: "monitoring",
      icon: <Gauge className="h-8 w-8 text-violet-400" />,
      title: "Telemetry Live Monitor",
      short: "Comprehensive real-time dashboard health tracker.",
      tech: "Bilateral fetch socket polling providing state information, battery levels, and telemetry logs.",
      impact: "Guarantees that your smart helmet is fully functional, charged, and connected before every ride.",
      accent: "from-violet-600/20 to-transparent"
    }
  ];

  return (
    <div className="space-y-12 py-4 animate-fade-in text-gray-100">
      <div className="max-w-3xl space-y-4">
        <div className="inline-block rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
          TECHNICAL DEEP DIVE
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">RideGuard+ Security Modules</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          RideGuard+ features modular components on a lightweight ESP32 microcontroller core. 
          Here's a breakdown of how the hardware array monitors active metrics to guarantee rider safety.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((item, i) => (
          <div
            key={item.id}
            className={`relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 overflow-hidden hover:border-slate-700/60 transition-all flex flex-col justify-between`}
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-800/40">
                {item.icon}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base font-sans">{item.title}</h3>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{item.short}</p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/60 space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider">HARDWARE LAYER</span>
                <span className="text-xs text-slate-300 font-sans mt-0.5 block">{item.tech}</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-400 font-mono block uppercase tracking-wider">SAFETY ADVANTAGE</span>
                <span className="text-xs text-emerald-300 font-sans mt-0.5 block">{item.impact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Core Microprocessor Pin Layout Schema Table */}
      <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Disc className="h-5 w-5 text-blue-500 animate-spin" style={{ animationDuration: "12s" }} />
          Smart Helmet Hardware Configuration Overview
        </h3>
        <p className="text-slate-400 text-xs mb-6 max-w-xl">
          Interested in replicating our design? Here is the reference ESP32 Pin Allocation schema used to build the hardware prototype.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-mono uppercase tracking-wider">Component</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider">Sensor Type</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider">ESP32 Pin Connection</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider">Signal Domain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              <tr>
                <td className="py-3 px-4 font-semibold">Proximity Detector</td>
                <td className="py-3 px-4">Infrared proximity beam module</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 14 (Digital)</td>
                <td className="py-3 px-4 font-mono text-slate-500">INPUT</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">DUI MQ Gas</td>
                <td className="py-3 px-4">MQ-3 Alcohol Analyzer</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 34 (Analog)</td>
                <td className="py-3 px-4 font-mono text-slate-500">INPUT (ADC)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">IMU Gyroscope</td>
                <td className="py-3 px-4">MPU6050 6-Axis Accelerometer</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 21 (SDA), GPIO 22 (SCL)</td>
                <td className="py-3 px-4 font-mono text-slate-500">I2C (SDA/SCL)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">GPS Satellite</td>
                <td className="py-3 px-4">NEO-6M GPS Tracker</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 16 (RX2), GPIO 17 (TX2)</td>
                <td className="py-3 px-4 font-mono text-slate-500">UART Serial</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">SOS Override Switch</td>
                <td className="py-3 px-4">Mechanical Push State Tactile Button</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 12 (Digital)</td>
                <td className="py-3 px-4 font-mono text-slate-500">INPUT (PullUp)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Ignition Interlock Relay</td>
                <td className="py-3 px-4">5V electromagnetic switch relay</td>
                <td className="py-3 px-4 font-mono text-blue-400">GPIO 25 (Digital)</td>
                <td className="py-3 px-4 font-mono text-slate-500">OUTPUT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
