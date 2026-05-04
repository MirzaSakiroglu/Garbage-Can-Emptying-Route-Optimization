/*
 * SmartBin — ESP32 Firmware Example
 * 
 * Reads HC-SR04 ultrasonic sensor, calculates trash fill level,
 * and sends HTTP POST to the SmartBin server every 30 seconds.
 * 
 * Hardware:
 *   - ESP32 DevKit
 *   - HC-SR04 Ultrasonic Sensor (Trig → GPIO 5, Echo → GPIO 18)
 *   - LED indicator (GPIO 2 — built-in on most boards)
 * 
 * Setup:
 *   1. Install ESP32 board support in Arduino IDE
 *   2. Set your WiFi credentials below
 *   3. Set your server URL below
 *   4. Upload to ESP32
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── Configuration ──────────────────────────────────────────────────────────

// WiFi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// SmartBin server
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000";
const char* API_KEY    = "smartbin-imu-2024";
const char* BIN_ID     = "BIN-001";  // Unique ID for this bin

// HC-SR04 pins
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// Bin physical dimensions (cm)
const float BIN_HEIGHT_CM    = 60.0;  // Empty bin depth (sensor to bottom)
const float SENSOR_OFFSET_CM = 5.0;   // Distance from sensor to top of bin

// Timing
const unsigned long PING_INTERVAL_MS     = 30000;  // 30 seconds
const unsigned long CHANGE_THRESHOLD     = 5;      // Send immediately if fill changes by 5%
const unsigned long WIFI_TIMEOUT_MS      = 10000;

// LED
const int LED_PIN = 2;

// ─── Globals ────────────────────────────────────────────────────────────────

unsigned long lastPingTime = 0;
int lastFillLevel = -1;
bool wifiConnected = false;

// ─── Setup ──────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("╔══════════════════════════════════╗");
  Serial.println("║  SmartBin ESP32 Firmware v1.0    ║");
  Serial.println("╚══════════════════════════════════╝");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  // Blink LED to indicate startup
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }

  connectWiFi();
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

void loop() {
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  }

  // Read sensor
  float distanceCm = readUltrasonic();
  int fillLevel = calculateFillLevel(distanceCm);

  Serial.printf("[Sensor] Distance: %.1f cm | Fill: %d%%\n", distanceCm, fillLevel);

  // Determine if we should send an update
  unsigned long now = millis();
  bool timeToSend = (now - lastPingTime >= PING_INTERVAL_MS);
  bool significantChange = (lastFillLevel >= 0 && abs(fillLevel - lastFillLevel) >= (int)CHANGE_THRESHOLD);

  if (timeToSend || significantChange) {
    sendPing(fillLevel);
    lastPingTime = now;
    lastFillLevel = fillLevel;
  }

  // Visual indicator
  if (fillLevel >= 80) {
    // Blink rapidly when full
    digitalWrite(LED_PIN, (millis() / 250) % 2 == 0);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  delay(2000);  // Read sensor every 2 seconds
}

// ─── WiFi Connection ────────────────────────────────────────────────────────

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("\n[WiFi] Connection failed!");
    wifiConnected = false;
  }
}

// ─── Ultrasonic Sensor Reading ──────────────────────────────────────────────

float readUltrasonic() {
  // Take 3 readings and average for stability
  float total = 0;
  int validReadings = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // 30ms timeout

    if (duration > 0) {
      float distance = (duration * 0.0343) / 2.0;  // Speed of sound: 343 m/s
      total += distance;
      validReadings++;
    }

    delay(50);
  }

  if (validReadings == 0) return BIN_HEIGHT_CM;  // Assume empty if sensor fails
  return total / validReadings;
}

// ─── Fill Level Calculation ─────────────────────────────────────────────────

int calculateFillLevel(float distanceCm) {
  // Subtract sensor offset
  float effectiveDistance = distanceCm - SENSOR_OFFSET_CM;

  // Clamp to valid range
  if (effectiveDistance < 0) effectiveDistance = 0;
  if (effectiveDistance > BIN_HEIGHT_CM) effectiveDistance = BIN_HEIGHT_CM;

  // Calculate fill percentage (closer distance = more full)
  float fillPercent = ((BIN_HEIGHT_CM - effectiveDistance) / BIN_HEIGHT_CM) * 100.0;

  // Clamp to 0-100
  int level = (int)fillPercent;
  if (level < 0) level = 0;
  if (level > 100) level = 100;

  return level;
}

// ─── Send HTTP Ping ─────────────────────────────────────────────────────────

void sendPing(int fillLevel) {
  if (!wifiConnected) {
    Serial.println("[HTTP] Not connected to WiFi, skipping ping");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/bins/" + BIN_ID + "/ping";

  Serial.printf("[HTTP] Sending ping to %s\n", url.c_str());

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  // Build JSON payload
  StaticJsonDocument<200> doc;
  doc["fill_level"] = fillLevel;
  doc["battery"] = getBatteryLevel();
  doc["temperature"] = getTemperature();

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.printf("[HTTP] Response: %d\n", httpCode);
    if (httpCode == 200) {
      String response = http.getString();
      Serial.printf("[HTTP] OK: %s\n", response.c_str());
    }
  } else {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ─── Helper: Battery Level (simplified) ─────────────────────────────────────

int getBatteryLevel() {
  // Read from ADC if using battery voltage divider
  // For now, return a simulated value
  // You can connect a voltage divider to GPIO 34 and read actual battery voltage
  return 85;  // Placeholder
}

// ─── Helper: Temperature (simplified) ───────────────────────────────────────

float getTemperature() {
  // ESP32 has a built-in temperature sensor (rough estimate)
  // For precise readings, use a DHT22 or DS18B20 sensor
  return temperatureRead();  // Built-in ESP32 temp sensor (approximate)
}
