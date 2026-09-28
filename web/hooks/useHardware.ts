// hooks/useHardware.ts
import { useState } from "react";
import { NoteData } from "../utils/musicLogic";
import { translateToHardware } from "../utils/hardwareTranslator";
import { serialService } from "../utils/webSerialService";
import { bluetoothService } from "../utils/webBluetoothService";

interface UseHardwareProps {
  notesList: NoteData[];
  keySignature: string;
}

export function useHardware({ notesList, keySignature }: UseHardwareProps) {
  const [connectionType, setConnectionType] = useState<"none" | "usb" | "ble">("none");
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState<number>(60);

  const handleConnectUSB = async () => {
    if (connectionType === "usb") {
      await serialService.disconnect();
      setConnectionType("none");
      return;
    }
    const success = await serialService.connect();
    if (success) {
      setConnectionType("usb");
      alert("🎹 Piano conectado correctamente por USB");
    }
  };

  const handleConnectBLE = async () => {
    if (connectionType === "ble") {
      await bluetoothService.disconnect();
      setConnectionType("none");
      return;
    }
    const success = await bluetoothService.connect();
    if (success) {
      setConnectionType("ble");
      alert("🛜 Piano conectado correctamente por Bluetooth");
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (connectionType === "usb") await serialService.stopSong();
      if (connectionType === "ble") await bluetoothService.stopSong();
      return;
    }

    if (notesList.length === 0) return alert("⚠️ No hay notas para reproducir.");

    setIsPlaying(true);
    const safeBpm = bpm > 0 ? bpm : 60;
    const data = translateToHardware(notesList, safeBpm, keySignature);

    if (connectionType === "usb") {
      await serialService.uploadAndPlaySong(data);
    } else if (connectionType === "ble") {
      await bluetoothService.uploadAndPlaySong(data);
    }

    const totalDuration = data.notes.starts.length > 0
      ? Math.max(...data.notes.starts.map((s: number, i: number) => s + data.notes.durs[i]))
      : 0;

    setTimeout(() => {
      setIsPlaying(false);
    }, totalDuration + 1000);
  };
  
  const handleDebugHardware = () => {
    if (notesList.length === 0) return alert("⚠️ No hay notas.");
    const safeBpm = bpm > 0 ? bpm : 60;
    const data = translateToHardware(notesList, safeBpm, keySignature);

    console.log(`=== DATOS PARA PIANO AUTOMÁTICO (${safeBpm} BPM) ===`);
    console.log("NOTAS:", data.notes);
    console.log("PEDAL:", data.pedal);

    alert(
      `✅ Datos generados a ${safeBpm} BPM.
Revisa la consola (F12) para ver los tiempos en milisegundos.`,
    );
  };

  return {
    connectionType,
    isPlaying,
    bpm,
    setBpm,
    handleConnectUSB,
    handleConnectBLE,
    handlePlay,
    handleDebugHardware,
  };
}
