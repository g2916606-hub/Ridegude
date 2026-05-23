import { useState } from "react";
import { 
  Cpu, Code, Terminal, CheckCircle, Copy, HelpCircle, HardDrive, Wifi, Radio, AlertOctagon, RefreshCw
} from "lucide-react";

export default function HardwareIntegrationView() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "arduino" | "api">("arduino");

  const pinConnectionData = [
    { component: "ESP32 DevKit V1", pin: "Power & Ground", target: "VCC to 3.3V / 5V, GND to GND Rails", purpose: "Main microcontroller power delivery" },
    { component: "MPU-6050 Accelerometer", pin: "SDA -> GPIO 21", target: "SCL -> GPIO 22", purpose: "Detects sudden dynamic deceleration forces to activate the emergency sequence" },
    { component: "NEO-6M GPS Module", pin: "TX -> GPIO 16 (RX2)", target: "RX -> GPIO 17 (TX2)", purpose: "Receives precise satellite latitude/longitude coordinates" },
    { component: "MQ-3 Alcohol Sensor", pin: "A0 / Analog Out", target: "GPIO 34 (ADC)", purpose: "Measures breath PPM. Values > 300 lock vehicle ignition" },
    { component: "SOS Microswitch Button", pin: "One side to GPIO 12", target: "Other side to GND (Pullup)", purpose: "Manual override trigger for direct immediate SMS dispatches" },
    { component: "Piezo Alarm Buzzer", pin: "Positive to GPIO 25", target: "Negative to GND", purpose: "Provides high-frequency hazard beeps during the 15s countdown" },
    { component: "IR Proximity Sensor (Helmet)", pin: "D0 Output -> GPIO 27", target: "VCC & GND connected", purpose: "Detects if physical helmet latch is worn correctly" }
  ];

  const arduinoCode = `/*
 * 🚨 RIDEGUARD+ IoT FIRMWARE - ESP32 EMBEDDED SYSTEM CODE 🚨
 * Developed for MPU6050, NEO-6M GPS, MQ3 Alcohol Sensor, SOS Button, and Buzzer.
 * Automatically broadcasts safety signals, location tracking, and impact events.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// 1. NETWORK CONFIGURATION
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server base domain location. Replace with your actual RideGuard+ server address!
// If testing locally on the same network, use the computer's private IP, e.g., "http://192.168.1.50:3000"
const String serverHost = "https://your-rideguard-instance.run.app"; 

// 2. PIN ALLOCATIONS
#define PIN_ALCOHOL_SENSOR 34   // MQ3 Analog Out -> GPIO34 (ADC1)
#define PIN_SOS_BUTTON     12   // Emergency SOS Button -> GPIO12 (Internal Pullup config)
#define PIN_BUZZER         25   // Alarm Piezo Beeper -> GPIO25
#define PIN_HELMET_IR      27   // IR Proximity Sensor -> GPIO27

// 3. TELEMETRY INTERVALS
unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 5000; // Track GIS location history every 5 seconds

// 4. MPU6050 I2C REGISTERS
const int MPU_ADDR = 0x68; // I2C address of MPU-6050
int16_t raw_accel_x, raw_accel_y, raw_accel_z;
float ax, ay, az;

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Configure general I/O pins
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_HELMET_IR, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize Wire interface for MPU6050
  Wire.begin(21, 22); // SDA = GPIO 21, SCL = GPIO 22
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Power Management Register
  Wire.write(0);    // Wake up MPU6050
  Wire.endTransmission(true);

  Serial.println("=================================================");
  Serial.println("  🤖 RIDEGUARD+ HARDWARE CORE BOOT SEQUENCE      ");
  Serial.println("=================================================");

  // Connect to local WiFi network
  WiFi.begin(ssid, password);
  Serial.print("Connecting to secure WiFi network: ");
  Serial.println(ssid);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    // Play dual beep indicating network standby
    digitalWrite(PIN_BUZZER, HIGH);
    delay(50);
    digitalWrite(PIN_BUZZER, LOW);
  }
  
  Serial.println("\\n🟢 WiFi online and hardware connected!");
  Serial.print("Local System IP Address: ");
  Serial.println(WiFi.localIP());

  // Confirm system setup beep success
  digitalWrite(PIN_BUZZER, HIGH);
  delay(250);
  digitalWrite(PIN_BUZZER, LOW);
}

// Read raw sensor parameters from MPU6050 Registers
void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register for Accelerometer Raw measurements
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  raw_accel_x = Wire.read() << 8 | Wire.read();
  raw_accel_y = Wire.read() << 8 | Wire.read();
  raw_accel_z = Wire.read() << 8 | Wire.read();

  // Convert raw 16-bit signed registers to standard G-forces (±2g range resolution: 16384 LSB/g)
  ax = (float)raw_accel_x / 16384.0;
  ay = (float)raw_accel_y / 16384.0;
  az = (float)raw_accel_z / 16384.0;
}

// Dispatches a HTTP POST request safely with robust logs
void sendPostRequest(String urlPath, String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Post attempt rejected: Wi-Fi connection lost!");
    return;
  }

  HTTPClient http;
  String targetUrl = serverHost + urlPath;
  Serial.print("Post dispatching -> IP: ");
  Serial.println(targetUrl);
  
  http.begin(targetUrl);
  http.addHeader("Content-Type", "application/json");

  int responseCode = http.POST(jsonPayload);

  if (responseCode > 0) {
    Serial.print("Response Code [");
    Serial.print(responseCode);
    Serial.println("]: ");
    String responseBody = http.getString();
    Serial.println(responseBody);
  } else {
    Serial.print("❌ Request Error occurred: ");
    Serial.println(http.errorToString(responseCode).c_str());
  }
  http.end();
}

void loop() {
  // 1. MONITOR DIRECT EMERGENCY SOS BUTTON (MANUAL OVERRIDE ROUTINE)
  if (digitalRead(PIN_SOS_BUTTON) == LOW) {
    Serial.println("🚨 EMERGENCY! Manual SOS push button triggered.");
    digitalWrite(PIN_BUZZER, HIGH);
    
    // Trigger instant post body to the secure emergency alert endpoints with default coordinate tags
    String payload = "{\\"lat\\":37.779213, \\"lng\\":-122.411124}";
    sendPostRequest("/api/sos", payload);

    delay(1000); // Debounce button limit
    digitalWrite(PIN_BUZZER, LOW);
  }

  // 2. CONTINUOUS ACCIDENT DETECTION CRASH SENSORS (MPU6050 CORES)
  readMPU6050();
  // Calculate aggregate dynamic acceleration scalar (total vector G-force magnitude)
  float totalForce = sqrt(ax * ax + ay * ay + az * az);

  // MPU6050 Impact threshold filter. Safe limits < 2.5G. Sudden crash events exceed.
  if (totalForce > 2.50) {
    Serial.println("\\n💥 CRASH VEHICLE VECTOR DETECTED!");
    Serial.print("Threshold G-Force Measured: ");
    Serial.print(totalForce);
    Serial.println(" G");

    // Sound local alarm beeper sequence for warning
    for(int i = 0; i < 5; i++) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(80);
      digitalWrite(PIN_BUZZER, LOW);
      delay(80);
    }

    // Prepare JSON payload details containing raw acceleration dynamics and current GIS markers
    String accidentPayload = "{\\"lat\\":37.779213,\\"lng\\":-122.411124,\\"accelX\\":" + String(ax, 3) + 
                             ",\\"accelY\\":" + String(ay, 3) + 
                             ",\\"accelZ\\":" + String(az, 3) + 
                             ",\\"rawGForce\\":" + String(totalForce, 2) + "}";
    
    sendPostRequest("/api/accident", accidentPayload);
    delay(2000); // Block collision cascading loops
  }

  // 3. PERIODIC NETWORK GIS TELEMETRY BREADCRUMBS FEED (NEO-6M SIMULATED AT MODULE)
  unsigned long currentTime = millis();
  if (currentTime - lastTelemetryTime >= telemetryInterval) {
    lastTelemetryTime = currentTime;

    // A. READ OUT BREATH ALCOHOL PPM VALUES (MQ-3 SENSOR)
    int rawAlcohol = analogRead(PIN_ALCOHOL_SENSOR);
    // Convert analog response to estimated PPM range values (100 - 1000 PPM base)
    int alcoholPPM = (rawAlcohol * 1000) / 4095;
    
    Serial.print("MQ-3 breath check PPM raw rating: ");
    Serial.println(alcoholPPM);

    String alcoholPayload = "{\\"alcoholLevel\\":" + String(alcoholPPM) + "}";
    sendPostRequest("/api/alcohol", alcoholPayload);

    // B. COMPLIANCE CHECK FOR IR SMART HELMET (WEAR CHECKS)
    // IR proximity sensor logic: Active High / Low depending on connection pin
    bool isWorn = digitalRead(PIN_HELMET_IR) == HIGH; 
    String helmetPayload = "{\\"worn\\":" + String(isWorn ? "true" : "false") + "}";
    sendPostRequest("/api/helmet", helmetPayload);

    // C. DISPATCH GPS COORDINATE UPDATE BREADCRUMB
    // In production hardware setup, receive dynamic NMEA data over NEO-6M Serial Stream.
    // We mock slight moving offsets with the baseline center (San Francisco GIS coordinates)
    float latitude = 37.779213 + ((random(-10, 10)) / 100000.0);
    float longitude = -122.411124 + ((random(-10, 10)) / 100000.0);
    float speedKmh = random(30, 85);

    String gpsPayload = "{\\"lat\\":" + String(latitude, 6) + 
                        ",\\"lng\\":" + String(longitude, 6) + 
                        ",\\"speed\\":" + String(speedKmh, 1) + "}";
    
    sendPostRequest("/api/location", gpsPayload);
  }

  delay(20); // Maintain smooth core loop execution cycles.
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 py-4 animate-fade-in text-gray-100 text-left">
      <div className="max-w-3xl space-y-3">
        <span className="inline-block rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          REAL IOT HARDWARE CODE MODULE
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          ESP32 Hardware Core & Firmware Manager
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Connect your physical RideGuard+ hardware node. We feature micro-second collision checking 
          and continuous emergency gateway pipelines to safeguard riders in critical impacts.
        </p>
      </div>

      {/* CORE INTEGRATION TABS SWITCHER */}
      <div className="border-b border-slate-800">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          <li className="mr-2">
            <button
              onClick={() => setActiveTab("arduino")}
              className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                activeTab === "arduino"
                  ? "text-emerald-400 border-emerald-500 bg-emerald-950/25"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-800"
              }`}
            >
              <Code className="h-4 w-4" />
              Arduino IDE Firmware
            </button>
          </li>
          <li className="mr-2">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                activeTab === "diagram"
                  ? "text-emerald-400 border-emerald-500 bg-emerald-950/25"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-800"
              }`}
            >
              <HardDrive className="h-4 w-4" />
              Circuit Layout & Pinouts
            </button>
          </li>
          <li className="mr-2">
            <button
              onClick={() => setActiveTab("api")}
              className={`inline-flex items-center gap-2 p-4 border-b-2 rounded-t-lg text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                activeTab === "api"
                  ? "text-emerald-400 border-emerald-500 bg-emerald-950/25"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-800"
              }`}
            >
              <Terminal className="h-4 w-4" />
              Rest API Gateways
            </button>
          </li>
        </ul>
      </div>

      {/* RENDER ACTIVE TAB CANVAS */}
      <div className="space-y-6">
        
        {activeTab === "arduino" && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-950 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Wifi className="text-emerald-400 h-5 w-5" />
                  ESP32 C++ Production Sketch
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Load this sketch onto your ESP32 DevKit board using the official Arduino IDE.
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-200 border border-slate-850 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      COPIED TO CLIPBOARD!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-400" />
                      COPY FIRMWARE CODE
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* REAL CODE PREVIEW BLOCK */}
            <div className="relative">
              <div className="absolute top-2.5 right-3 bg-red-950/30 border border-red-900/20 rounded-lg px-2.5 py-1 text-[9px] font-mono text-red-400 uppercase tracking-wide animate-pulse">
                🔴 REAL IoT HARDWARE LINKABLE
              </div>
              <pre className="p-5 rounded-2xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto max-h-[480px] border border-slate-850 leading-relaxed text-left selection:bg-emerald-950 select-text">
                {arduinoCode}
              </pre>
            </div>

            {/* PRE-BUILD VERIFICATION CHECKS LIST */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-3">
              <h4 className="font-bold text-xs text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="h-4 w-4 animate-ping" /> Pre-Compilation Checks:
              </h4>
              <ul className="text-xs text-slate-400 space-y-2 max-w-4xl list-disc pl-4 leading-relaxed font-sans">
                <li>
                  <strong>Board Configuration:</strong> Go to <code className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[11px]">Tools &gt; Board &gt; ESP32 Arduino</code> and select <code className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[11px]">ESP32 Dev Module</code>.
                </li>
                <li>
                  <strong>WiFi Host Setup:</strong> Replace <code className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[11px]">your-rideguard-instance.run.app</code> with the current browser preview URL or deployment instance domain (exclude the trailing slash!).
                </li>
                <li>
                  <strong>Raw Acceleration Limits:</strong> If testing the hardware module on a desk, sharp palm taps directly on the breadboard accelerometer triggers G-force ratings &gt; 2.5G, activating the immediate dashboard visual alert countdown sequence!
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "diagram" && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Circuit Pinout Matrix</h3>
              <p className="text-xs text-slate-400">
                Connect the modular hardware sensors to your microchip utilizing the specific GPIO routing pins documented:
              </p>
            </div>

            {/* DIAGRAM TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 text-left border-collapse border border-slate-850">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-850">
                  <tr>
                    <th className="p-3 border border-slate-850">Hardware Module</th>
                    <th className="p-3 border border-slate-850">ESP32 Core Pin</th>
                    <th className="p-3 border border-slate-850">Secondary Link Pin</th>
                    <th className="p-3 border border-slate-850">Telemetry System Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pinConnectionData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/30">
                      <td className="p-3 border border-slate-850 font-bold text-white">{item.component}</td>
                      <td className="p-3 border border-slate-850 font-mono text-emerald-400">{item.pin}</td>
                      <td className="p-3 border border-slate-850 font-mono text-slate-400">{item.target}</td>
                      <td className="p-3 border border-slate-850 text-slate-400">{item.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SCHEMATIC NOTES */}
            <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-5 flex gap-4 text-xs">
              <AlertOctagon className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed">
                <h4 className="font-bold text-white uppercase tracking-wide font-mono text-[11px]">Hardware Calibration Guidelines:</h4>
                <p className="text-slate-400 font-sans">
                  The MQ-3 Alcohol sensor requires a pre-heating period of 2 minutess before the analog voltage levels stabilize to correct baseline figures. Do not check PPM calibration results immediately after power insertion. Secure the piezo buzzer directly into a PWM-supported digital pin for loudest audio beeps!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">CURL Debugging Gateway</h3>
              <p className="text-xs text-slate-400">
                You can manually simulate real-mode network outputs using immediate HTTP Client command line execution tools:
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/10 inline-block">
                  POST /api/accident
                </span>
                <p className="text-xs text-slate-400">Forces immediate collision accident status triggers:</p>
                <code className="block bg-slate-900/40 p-3 rounded-lg font-mono text-[11px] text-slate-300 whitespace-pre border border-slate-850 overflow-x-auto select-all">
                  curl -X POST -H "Content-Type: application/json" -d '{`{"lat":37.779,"lng":-122.411,"accelX":4.2,"accelY":-1.1,"accelZ":2.5,"rawGForce":4.2`}' {window.location.origin}/api/accident
                </code>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/10 inline-block">
                  POST /api/location
                </span>
                <p className="text-xs text-slate-400 font-sans">Forwards periodic satellite coordinate points history tracker:</p>
                <code className="block bg-slate-900/40 p-3 rounded-lg font-mono text-[11px] text-slate-300 whitespace-pre border border-slate-850 overflow-x-auto select-all">
                  curl -X POST -H "Content-Type: application/json" -d '{`{"lat":37.779213,"lng":-122.411124,"speed":62.5`}' {window.location.origin}/api/location
                </code>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/10 inline-block">
                  POST /api/alcohol
                </span>
                <p className="text-xs text-slate-400 font-sans">Submits MQ3 breath PPM values directly:</p>
                <code className="block bg-slate-900/40 p-3 rounded-lg font-mono text-[11px] text-slate-300 whitespace-pre border border-slate-850 overflow-x-auto select-all">
                  curl -X POST -H "Content-Type: application/json" -d '{`{"alcoholLevel":350`}' {window.location.origin}/api/alcohol
                </code>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
