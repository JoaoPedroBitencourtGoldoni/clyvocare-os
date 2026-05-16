// ============================================================
// ClyvoCare OS — ESP32 Firmware (Wokwi Simulation)
// Sensores: DHT22 (Temp/Umidade), Potenciômetro (simula peso),
//           PIR (movimento), Buzzer (alerta)
// Protocolo: MQTT via HiveMQ
// ============================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ---- Configurações WiFi ----
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// ---- Configurações HiveMQ ----
const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";
const char* MQTT_PASSWORD = "";
const char* CLIENT_ID     = "clyvocare-esp32-001";

// ---- Tópicos MQTT ----
const char* TOPIC_TEMP    = "clyvocare/esp32/temperatura";
const char* TOPIC_HUM     = "clyvocare/esp32/umidade";
const char* TOPIC_PESO    = "clyvocare/esp32/peso";
const char* TOPIC_MOV     = "clyvocare/esp32/movimento";
const char* TOPIC_ALERTA  = "clyvocare/alertas/critico";
const char* TOPIC_STATUS  = "clyvocare/esp32/status";

// ---- Pinos ----
#define DHT_PIN       4
#define DHT_TYPE      DHT22
#define POT_PIN       34
#define PIR_PIN       18
#define BUZZER_PIN    19
#define LED_STATUS    2
#define LED_ALERT     5

// ---- Objetos ----
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ---- Variáveis ----
unsigned long lastPublish  = 0;
unsigned long lastBlink    = 0;
const long    PUBLISH_INTERVAL = 3000;

float lastTemp = 0;
float lastHum  = 0;
float lastPeso = 0;
int   lastMov  = 0;
bool  alertaAtivo = false;


void setup() {
  Serial.begin(115200);
  Serial.println("\n🐾 ClyvoCare OS — ESP32 Iniciando...");

  pinMode(PIR_PIN,    INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  pinMode(LED_ALERT,  OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_ALERT, LOW);

  dht.begin();
  Serial.println("✓ DHT22 inicializado");

  conectarWifi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(callbackMQTT);
  mqttClient.setKeepAlive(60);
  conectarMQTT();

  Serial.println("✓ Setup concluído. Publicando dados...\n");
}


void loop() {
  if (!mqttClient.connected()) {
    conectarMQTT();
  }
  mqttClient.loop();

  unsigned long agora = millis();
  if (agora - lastBlink > 1000) {
    lastBlink = agora;
    digitalWrite(LED_STATUS, !digitalRead(LED_STATUS));
  }

  if (agora - lastPublish > PUBLISH_INTERVAL) {
    lastPublish = agora;
    lerEPublicarSensores();
  }
}


void lerEPublicarSensores() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠ Erro na leitura DHT22 — usando valor anterior");
    temp = lastTemp;
    hum  = lastHum;
  } else {
    lastTemp = temp;
    lastHum  = hum;
  }

  int rawPot = analogRead(POT_PIN);
  float peso = map(rawPot, 0, 4095, 0, 500) / 10.0;
  lastPeso = peso;

  int movimento = digitalRead(PIR_PIN);
  lastMov = movimento;

  Serial.println("─────────────────────────────");
  Serial.printf("🌡 Temperatura : %.1f °C\n", temp);
  Serial.printf("💧 Umidade     : %.1f %%\n", hum);
  Serial.printf("⚖  Peso        : %.1f kg\n", peso);
  Serial.printf("🏃 Movimento   : %s\n", movimento ? "DETECTADO" : "Sem movimento");

  publicarFloat(TOPIC_TEMP, temp, 1);
  publicarFloat(TOPIC_HUM,  hum,  1);
  publicarFloat(TOPIC_PESO, peso, 1);
  publicarInt(TOPIC_MOV, movimento);
  publicarStatusCompleto(temp, hum, peso, movimento);
  verificarAlertas(temp, peso);
}

void publicarFloat(const char* topic, float valor, int casas) {
  char buf[16];
  dtostrf(valor, 4, casas, buf);
  mqttClient.publish(topic, buf);
}

void publicarInt(const char* topic, int valor) {
  char buf[8];
  itoa(valor, buf, 10);
  mqttClient.publish(topic, buf);
}

void publicarStatusCompleto(float temp, float hum, float peso, int mov) {
  StaticJsonDocument<256> doc;
  doc["device"]      = CLIENT_ID;
  doc["temperatura"] = temp;
  doc["umidade"]     = hum;
  doc["peso"]        = peso;
  doc["movimento"]   = mov;
  doc["timestamp"]   = millis();
  doc["versao"]      = "1.0.0";

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_STATUS, buffer);
}

void verificarAlertas(float temp, float peso) {
  bool novoAlerta = false;
  String motivo = "";

  if (temp > 39.2) {
    novoAlerta = true;
    motivo = "FEBRE: " + String(temp, 1) + "C";
    Serial.println("🚨 ALERTA: Temperatura elevada!");
  }

  if (temp < 37.5 && temp > 20.0) {
    novoAlerta = true;
    motivo = "HIPOTERMIA: " + String(temp, 1) + "C";
    Serial.println("🚨 ALERTA: Hipotermia detectada!");
  }

  if (novoAlerta) {
    digitalWrite(LED_ALERT, HIGH);
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
      delay(200);
    }

    StaticJsonDocument<200> alertDoc;
    alertDoc["pet"]    = "Thor";
    alertDoc["tipo"]   = "CRITICO";
    alertDoc["motivo"] = motivo;
    alertDoc["valor"]  = temp;
    alertDoc["acao"]   = "Verificar imediatamente";
    alertDoc["ts"]     = millis();

    char alertBuf[200];
    serializeJson(alertDoc, alertBuf);
    mqttClient.publish(TOPIC_ALERTA, alertBuf);
    Serial.printf("📡 Alerta publicado: %s\n", alertBuf);

    alertaAtivo = true;
  } else {
    if (alertaAtivo) {
      digitalWrite(LED_ALERT, LOW);
      alertaAtivo = false;
    }
  }
}


void callbackMQTT(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.printf("📩 Mensagem recebida [%s]: %s\n", topic, msg.c_str());

  if (String(topic) == "clyvocare/cmd/buzzer") {
    if (msg == "ON") {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(500);
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println("🔔 Buzzer acionado remotamente!");
    }
  }
}


void conectarWifi() {
  Serial.printf("📶 Conectando ao WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✓ WiFi conectado! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n✗ Falha no WiFi. Verificar credenciais.");
  }
}


void conectarMQTT() {
  Serial.printf("📡 Conectando ao MQTT: %s:%d\n", MQTT_BROKER, MQTT_PORT);

  int tentativas = 0;
  while (!mqttClient.connected() && tentativas < 5) {
    Serial.print(".");

    bool conectado;
    if (strlen(MQTT_USER) > 0) {
      conectado = mqttClient.connect(CLIENT_ID, MQTT_USER, MQTT_PASSWORD);
    } else {
      conectado = mqttClient.connect(CLIENT_ID);
    }

    if (conectado) {
      Serial.println("\n✓ MQTT conectado ao HiveMQ!");
      mqttClient.publish("clyvocare/status", "ESP32 ClyvoCare Online");
      mqttClient.subscribe("clyvocare/cmd/#");
      Serial.println("✓ Subscrito em clyvocare/cmd/#");
    } else {
      Serial.printf("\n✗ Falha MQTT (código: %d). Tentando em 3s...\n", mqttClient.state());
      delay(3000);
    }
    tentativas++;
  }
}