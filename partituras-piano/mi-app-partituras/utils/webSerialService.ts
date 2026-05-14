// src/utils/webSerialService.ts

class WebSerialService {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();

  // 🔥 NUEVO: El "Embudo" para que los acordes no atasquen el cable
  private writeQueue: string[] = [];
  private isWriting = false;

  async connect() {
    try {
      if (!("serial" in navigator)) {
        alert(
          "Tu navegador no soporta Web Serial API. Usa Google Chrome o Edge.",
        );
        return false;
      }
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.writer = this.port.writable?.getWriter() || null;
      console.log("✅ Conectado al Arduino con éxito.");
      return true;
    } catch (error: any) {
      if (error.name === "NotFoundError" || error.name === "AbortError") {
        console.log("🔌 Selección cancelada.");
      } else {
        console.error("❌ Error real conectando:", error);
      }
      return false;
    }
  }

  // Ahora en lugar de enviar directo, metemos en la cola
  async sendCommand(command: string) {
    if (!this.writer) return;

    // Metemos el comando en el embudo con el salto de línea
    this.writeQueue.push(command + "\n");

    // Llamamos al motor que vacía el embudo
    this.processQueue();
  }

  // Este es el motor que envía uno por uno a toda velocidad
  private async processQueue() {
    // Si ya está enviando algo, o no hay nada que enviar, no hace nada
    if (this.isWriting || this.writeQueue.length === 0 || !this.writer) return;

    this.isWriting = true; // "Cierra la puerta" para que nadie más se cuele

    try {
      // Mientras haya cosas en el embudo...
      while (this.writeQueue.length > 0) {
        const cmd = this.writeQueue.shift(); // Saca el primero
        if (cmd) {
          const data = this.encoder.encode(cmd);
          await this.writer.write(data); // Lo envía por el cable de forma segura
        }
      }
    } catch (error) {
      console.error("❌ Error escribiendo en el puerto serie:", error);
    } finally {
      this.isWriting = false; // "Abre la puerta" de nuevo
    }
  }

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

export const serialService = new WebSerialService();
