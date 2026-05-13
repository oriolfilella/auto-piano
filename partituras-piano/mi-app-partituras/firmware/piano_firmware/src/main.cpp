#include <FastLED.h>

// Ajusta esto a tu tira LED real
#define NUM_LEDS 88 
#define DATA_PIN 6

CRGB leds[NUM_LEDS];

void setup() {
  // Inicializamos la comunicación a alta velocidad (muy importante para evitar lag)
  Serial.begin(115200);
  
  // Configuramos la tira LED
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(100); // Brillo general (0-255)
  FastLED.clear();
  FastLED.show();
}

void loop() {
  // Si nos llega un mensaje desde la página web...
  if (Serial.available() > 0) {
    // Leemos la línea entera hasta el salto de línea (\n)
    String command = Serial.readStringUntil('\n');
    
    // Parseamos el comando. Esperamos formatos: "ON,LED,VELOCITY" o "OFF,LED"
    int firstComma = command.indexOf(',');
    int secondComma = command.indexOf(',', firstComma + 1);
    
    if (firstComma > 0) {
      String action = command.substring(0, firstComma);
      
      if (action == "ON" && secondComma > 0) {
        int ledIndex = command.substring(firstComma + 1, secondComma).toInt();
        int velocity = command.substring(secondComma + 1).toInt();
        
        if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
          // Por ahora encendemos en color azul eléctrico, la intensidad depende de la velocidad
          // En el futuro podemos cambiar el color según la mano derecha/izquierda
          leds[ledIndex] = CHSV(160, 255, velocity); 
          FastLED.show();
        }
      } 
      else if (action == "OFF") {
        int ledIndex = command.substring(firstComma + 1).toInt();
        
        if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
          leds[ledIndex] = CRGB::Black; // Apagamos el LED
          FastLED.show();
        }
      }
    }
  }
}