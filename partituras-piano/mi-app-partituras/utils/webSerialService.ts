// src/utils/webSerialService.ts

class WebSerialService {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();

  // Función para abrir la ventanita del navegador y elegir el Arduino
  async connect() {
    try {
      if (!("serial" in navigator)) {
        alert(
          "Tu navegador no soporta Web Serial API. Usa Google Chrome o Microsoft Edge.",
        );
        return false;
      }

      // Pedimos permiso al usuario para conectar
      this.port = await navigator.serial.requestPort();

      // Abrimos la conexión a 115200 baudios (la misma velocidad que el Arduino)
      await this.port.open({ baudRate: 115200 });

      this.writer = this.port.writable?.getWriter() || null;
      console.log("✅ Conectado al Arduino con éxito.");
      return true;
    } catch (error) {
      console.error("❌ Error conectando al puerto serie:", error);
      return false;
    }
  }

  // Función para enviar un comando de texto al Arduino
  async sendCommand(command: string) {
    if (!this.writer) {
      console.warn("⚠️ No hay conexión con el Arduino. Conecta primero.");
      return;
    }

    try {
      // Convertimos el texto a bytes y le añadimos un salto de línea para que el Arduino sepa que terminó
      const data = this.encoder.encode(command + "\n");
      await this.writer.write(data);
    } catch (error) {
      console.error("❌ Error enviando comando:", error);
    }
  }

  // Función para cerrar la conexión
  async disconnect() {
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    console.log("🔌 Desconectado del Arduino.");
  }
}

// Exportamos una única instancia para usarla en toda la app
export const serialService = new WebSerialService();
