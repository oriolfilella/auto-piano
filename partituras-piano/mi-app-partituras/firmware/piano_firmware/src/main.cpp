#include <FastLED.h>

#define NUM_LEDS 88 
#define DATA_PIN 6

CRGB leds[NUM_LEDS];
bool ledsChanged = false;
unsigned long lastDataTime = 0; // 🔥 El reloj que mide la paciencia del Arduino

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(5); 
  
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(25); // Brillo bajito
  FastLED.clear();
  FastLED.show();
}

void loop() {
  // 1. LEER DATOS
  while (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("ON")) {
      int firstComma = command.indexOf(',');
      int secondComma = command.indexOf(',', firstComma + 1);
      
      if (firstComma > 0 && secondComma > 0) {
        int ledIndex = command.substring(firstComma + 1, secondComma).toInt();
        int velocity = command.substring(secondComma + 1).toInt();
        
        if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
          leds[ledIndex] = CHSV(160, 255, velocity); 
          ledsChanged = true;
        }
      }
    } 
    else if (command.startsWith("OFF")) {
      int firstComma = command.indexOf(',');
      if (firstComma > 0) {
        int ledIndex = command.substring(firstComma + 1).toInt();
        
        if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
          leds[ledIndex] = CRGB::Black;
          ledsChanged = true;
        }
      }
    }
    
    // 🔥 Acabamos de recibir algo, reseteamos el reloj de espera
    lastDataTime = millis(); 
  }

  // 2. ACTUALIZAR LAS LUCES (Con paciencia)
  // Solo actualizamos si hay cambios Y han pasado al menos 5 milisegundos 
  // desde la ÚLTIMA letra que recibimos. Así aseguramos que el acorde ha entrado entero.
  if (ledsChanged && (millis() - lastDataTime > 5)) {
    FastLED.show();
    ledsChanged = false;
  }
}