// src/utils/webSerialService.ts

class WebSerialService {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private encoder = new TextEncoder();

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
      console.log("✅ Conectado al piano con éxito.");
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

  async sendCommand(command: string) {
    if (!this.writer) return;
    this.writeQueue.push(command + "\n");
    this.processQueue();
  }

  private async processQueue() {
    if (this.isWriting || this.writeQueue.length === 0 || !this.writer) return;
    this.isWriting = true;

    try {
      while (this.writeQueue.length > 0) {
        const cmd = this.writeQueue.shift();
        if (cmd) {
          const data = this.encoder.encode(cmd);
          await this.writer.write(data);
        }
      }
    } catch (error) {
      console.error("❌ Error escribiendo en el puerto serie:", error);
    } finally {
      this.isWriting = false;
    }
  }

  // 🔥 NUEVO: Función para volcar la partitura entera al ESP32
  async uploadAndPlaySong(hardwareData: any) {
    if (!this.writer) {
      console.error("No hay conexión Serial.");
      return;
    }

    console.log("Limpiando memoria del ESP32...");
    await this.sendCommand("CLEAR");

    // Pequeño respiro para que el ESP32 procese el CLEAR
    await new Promise((r) => setTimeout(r, 50));

    const { leds, starts, durs, vels } = hardwareData.notes;
    console.log(`Subiendo partitura... (${leds.length} notas)`);

    for (let i = 0; i < leds.length; i++) {
      const cmd = `N,${leds[i]},${starts[i]},${durs[i]},${vels[i]}`;
      console.log("Enviando:", cmd);
      await this.sendCommand(cmd);

      // IMPORTANTE: Pausamos 10ms cada 10 notas para no saturar el buffer del ESP32
      if (i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    console.log("✅ Partitura subida. ¡Empezando a tocar!");
    await this.sendCommand("PLAY");
  }

  // 🔥 NUEVO: Función para detener la placa
  async stopSong() {
    await this.sendCommand("STOP");
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
    console.log("🔌 Desconectado del piano.");
  }
}

export const serialService = new WebSerialService();
