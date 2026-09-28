#include <Wire.h>
#include <FastLED.h>
#include <vector>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Adafruit_PWMServoDriver.h>

#define NUM_LEDS 88
#define DATA_PIN 16
#define LED_INTERNO 2
#define NUM_SERVOS 12
#define SERVO_REST_ANGLE 0
#define SERVO_PRESS_ANGLE 90
#define SERVO_MIN 150
#define SERVO_MAX 600

// --- Configuración BLE ---
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"

CRGB leds[NUM_LEDS];
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

struct NoteEvent {
  uint8_t led;
  uint32_t startMs;
  uint32_t durMs;
  uint8_t vel;
  bool isPlaying;
  bool isFinished;
  int servoIndex;
};

struct ServoState {
  bool isPressed;
  uint32_t releaseAtMs;
};

std::vector<NoteEvent> song;
std::vector<NoteEvent> playQueue;
ServoState servoStates[NUM_SERVOS];
bool isPlaying = false;
uint32_t playStartTime = 0;
bool deviceConnected = false;

uint16_t angleToPulse(int angle) {
  return map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
}

void writeServoPulse(int channel, int angle) {
  if (channel < 0 || channel >= NUM_SERVOS) return;
  uint16_t pulse = angleToPulse(angle);
  pwm.setPWM(channel, 0, pulse);
}

void resetServoStates() {
  for (int i = 0; i < NUM_SERVOS; i++) {
    servoStates[i].isPressed = false;
    servoStates[i].releaseAtMs = 0;
  }
}

// Resetea los servos añadiendo un pequeño retraso para no agotar la corriente
void resetServos() {
  for (int i = 0; i < NUM_SERVOS; i++) {
    writeServoPulse(i, SERVO_REST_ANGLE);
    delay(15); // Escalonamos 15ms el encendido para proteger la fuente de alimentación
  }
  resetServoStates();
}

void pressServoForNote(NoteEvent &note) {
  int servoIndex = note.led % NUM_SERVOS;
  
  // Margen mecánico para subir (120ms)
  uint32_t gap = (note.durMs > 200) ? 120 : (note.durMs / 2);
  
  servoStates[servoIndex].releaseAtMs = note.startMs + note.durMs - gap;
  servoStates[servoIndex].isPressed = true;
  
  writeServoPulse(servoIndex, SERVO_PRESS_ANGLE);
}

void updateServos(uint32_t currentMs) {
  for (int i = 0; i < NUM_SERVOS; i++) {
    ServoState &state = servoStates[i];
    
    if (state.isPressed && currentMs >= state.releaseAtMs) {
      writeServoPulse(i, SERVO_REST_ANGLE);
      state.isPressed = false;
      
      // TRUCO ANTI-CUELGUE: Solo liberamos 1 servo por vuelta del loop.
      // Si hay un acorde soltándose a la vez, el siguiente motor se soltará 
      // milisegundos después, evitando colapsar la electricidad.
      break; 
    }
  }
}

void ejecutarComando(String command) {
  command.trim();

  if (command == "CLEAR") {
    song.clear();
    playQueue.clear();
    isPlaying = false;
    resetServos();
    FastLED.clear();
    FastLED.show();
    digitalWrite(LED_INTERNO, LOW);
  }
  else if (command.startsWith("N,")) {
    int i1 = command.indexOf(',');
    int i2 = command.indexOf(',', i1 + 1);
    int i3 = command.indexOf(',', i2 + 1);
    int i4 = command.indexOf(',', i3 + 1);

    if (i1 > 0 && i2 > 0 && i3 > 0) {
      uint8_t led = command.substring(i1 + 1, i2).toInt();
      uint32_t startMs = command.substring(i2 + 1, i3).toInt();
      uint32_t durMs = command.substring(i3 + 1, i4).toInt();
      uint8_t vel = (i4 > 0) ? command.substring(i4 + 1).toInt() : 150;
      song.push_back({led, startMs, durMs, vel, false, false, -1});
    }
  }
  else if (command == "PLAY") {
    playQueue.clear();
    for (auto &n : song) {
      playQueue.push_back({n.led, n.startMs, n.durMs, n.vel, false, false, -1});
    }
    resetServos();
    isPlaying = true;
    playStartTime = millis();
    digitalWrite(LED_INTERNO, HIGH);
  }
  else if (command == "STOP") {
    isPlaying = false;
    playQueue.clear();
    resetServos();
    FastLED.clear();
    FastLED.show();
    digitalWrite(LED_INTERNO, LOW);
  }
}

class MisCallbacksDeServidor: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { deviceConnected = true; }
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      pServer->getAdvertising()->start();
    }
};

class MisCallbacksDeCaracteristica: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        String comandoBLE = String(rxValue.c_str());
        ejecutarComando(comandoBLE);
      }
    }
};

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(5);
  pinMode(LED_INTERNO, OUTPUT);
  digitalWrite(LED_INTERNO, LOW);

  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(25);
  FastLED.clear();
  FastLED.show();

  Wire.begin(21, 19);
  pwm.begin();
  pwm.setPWMFreq(50);
  delay(10);
  
  // Esto ahora pondrá los 12 servos a 0 de uno en uno con un pequeño retraso
  resetServos(); 

  BLEDevice::init("AutoPiano");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MisCallbacksDeServidor());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE
  );

  pCharacteristic->setCallbacks(new MisCallbacksDeCaracteristica());
  pService->start();

  BLEAdvertising *pAdvertising = pServer->getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();

  Serial.println("Bluetooth Listo! Buscando conexiones...");
}

void loop() {
  while (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    ejecutarComando(command);
  }

  if (isPlaying) {
    uint32_t currentMs = millis() - playStartTime;
    bool ledsChanged = false;

    // 1) Revisar si algún motor debe volver a 0
    updateServos(currentMs);

    // 2) Procesar fin de notas (Apagar LEDs)
    for (auto &note : playQueue) {
      if (note.isFinished) continue;
      if (note.isPlaying && currentMs >= (note.startMs + note.durMs)) {
        leds[note.led] = CRGB::Black;
        note.isFinished = true;
        note.isPlaying = false;
        ledsChanged = true;
      }
    }

    // 3) Procesar inicio de notas (Encender LEDs y Bajar Motores)
    for (auto &note : playQueue) {
      if (note.isFinished) continue;
      if (!note.isPlaying && currentMs >= note.startMs) {
        leds[note.led] = CHSV(160, 255, note.vel);
        note.isPlaying = true;
        
        pressServoForNote(note);
        ledsChanged = true;
        
        // TRUCO ANTI-CUELGUE: Si es un acorde de 3 notas, rompemos el bucle aquí.
        // La siguiente nota se encenderá en la siguiente iteración del loop (~3ms después)
        break; 
      }
    }

    if (ledsChanged) {
      FastLED.show();
    }

    // 4) COMPROBAR FIN DE CANCIÓN
    bool allFinished = true;
    for (const auto &note : playQueue) {
      if (!note.isFinished) {
        allFinished = false;
        break;
      }
    }

    // Si todas las notas ya se han tocado, cerramos la reproducción de forma limpia
    if (allFinished) {
      isPlaying = false;
      Serial.println("[SONG END] Canción terminada. Reseteando servos a 0...");
      resetServos(); // Esto llamará a la función que los pone a 0 de forma segura
      FastLED.clear();
      FastLED.show();
      digitalWrite(LED_INTERNO, LOW);
    }
  }
}