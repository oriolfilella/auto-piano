// src/utils/webBluetoothService.ts

// Usamos los mismos UUIDs que en el ESP32
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

class WebBluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private encoder = new TextEncoder();

  async connect() {
    try {
      if (!navigator.bluetooth) {
        alert(
          "Web Bluetooth no está soportado en este navegador. Usa Chrome o Edge.",
        );
        return false;
      }

      console.log("Buscando dispositivos Bluetooth...");
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "AutoPiano" }],
        optionalServices: [SERVICE_UUID],
      });

      console.log("Conectando al servidor GATT...");
      const server = await this.device.gatt?.connect();

      console.log("Obteniendo servicio...");
      const service = await server?.getPrimaryService(SERVICE_UUID);

      console.log("Obteniendo característica...");
      if (service) {
        this.characteristic =
          await service.getCharacteristic(CHARACTERISTIC_UUID);
      }

      console.log("✅ Conectado por Bluetooth con éxito.");
      return true;
    } catch (error) {
      console.error("❌ Error conectando por Bluetooth:", error);
      return false;
    }
  }

  async sendCommand(command: string) {
    if (!this.characteristic) return;
    try {
      const data = this.encoder.encode(command);
      // Escribimos directamente en la característica de la placa
      await this.characteristic.writeValueWithoutResponse(data);
    } catch (error) {
      console.error("Error enviando comando BLE:", error);
    }
  }

  async uploadAndPlaySong(hardwareData: any) {
    if (!this.characteristic) {
      console.error("No hay conexión Bluetooth.");
      return;
    }

    console.log("Limpiando memoria del ESP32...");
    await this.sendCommand("CLEAR");
    await new Promise((r) => setTimeout(r, 50));

    const { leds, starts, durs, vels } = hardwareData.notes;
    console.log(`Subiendo partitura por BLE... (${leds.length} notas)`);

    for (let i = 0; i < leds.length; i++) {
      const cmd = `N,${leds[i]},${starts[i]},${durs[i]},${vels[i]}`;
      await this.sendCommand(cmd);

      // En Bluetooth damos un poquito más de tiempo entre paquetes para no saturar la antena
      if (i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    console.log("✅ Partitura subida. ¡Empezando a tocar!");
    await this.sendCommand("PLAY");
  }

  async stopSong() {
    await this.sendCommand("STOP");
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    console.log("🔌 Desconectado del Bluetooth.");
  }
}

export const bluetoothService = new WebBluetoothService();
