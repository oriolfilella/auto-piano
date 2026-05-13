// src/utils/hardwareTranslator.ts
import { NoteData, getBeats, KEY_SIGNATURES } from "./musicLogic";

const noteOffsets: Record<string, number> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

// Mapeo de dinámicas a fuerza (0-255) para controlar el PWM (Voltaje del solenoide)
const DYNAMICS_MAP: Record<string, number> = {
  p: 80,
  mp: 120,
  mf: 160,
  f: 210,
  ff: 255,
  none: 150,
};

export const keyToLedIndex = (keyStr: string, globalKeySig: string): number => {
  const parts = keyStr.toLowerCase().split("/");
  if (parts.length !== 2) return -1;

  let pitch = parts[0];
  const octave = parseInt(parts[1], 10);
  const baseNote = pitch[0];
  let accidental = pitch.substring(1);

  if (accidental === "" || accidental === "n") {
    const keyAccidentals = KEY_SIGNATURES[globalKeySig] || {};
    if (accidental === "n") accidental = "";
    else accidental = keyAccidentals[baseNote] || "";
  }

  let noteValue = noteOffsets[baseNote];
  if (accidental === "#") noteValue += 1;
  if (accidental === "b") noteValue -= 1;

  const midiNote = octave * 12 + noteValue + 12;
  return midiNote - 21; // A0 = LED 0
};

export const translateToHardware = (
  notes: NoteData[],
  bpm: number,
  keySig: string,
) => {
  const msPerBeat = 60000 / bpm;
  const noteEvents: any[] = [];
  const pedalEvents: { startMs: number; durMs: number }[] = [];

  const timelines = [
    { clef: "treble", voice: 1 },
    { clef: "treble", voice: 2 },
    { clef: "bass", voice: 1 },
    { clef: "bass", voice: 2 },
  ];

  timelines.forEach((tl) => {
    let currentMs = 0;
    const trackNotes = notes.filter(
      (n) => n.clef === tl.clef && (n.voice || 1) === tl.voice,
    );

    // --- 1. DESENROLLAR REPETICIONES (Loop Unrolling) ---
    // En lugar de leer directamente, preparamos un array donde las repeticiones
    // se insertan físicamente dos veces.
    const unrolledNotes: NoteData[] = [];
    let sectionBuffer: NoteData[] = [];

    trackNotes.forEach((note) => {
      sectionBuffer.push(note);
      if (note.hasEndRepeat) {
        // Encontramos repetición: Añadimos el bloque normal y luego su repetición
        unrolledNotes.push(...sectionBuffer);
        unrolledNotes.push(...sectionBuffer);
        sectionBuffer = []; // Limpiamos para el siguiente bloque
      }
    });
    // Añadimos las notas finales que no están en una repetición
    unrolledNotes.push(...sectionBuffer);

    // --- 2. TRADUCCIÓN CON ESTADOS (Dinámicas "Pegajosas" y Pedal) ---
    let currentVelocity = DYNAMICS_MAP["none"]; // Empezamos en un nivel medio
    let isPedalDown = false;
    let pedalStartMs = 0;

    for (let i = 0; i < unrolledNotes.length; i++) {
      const note = unrolledNotes[i];
      const beats = getBeats(note.duration, note.isDotted, note.isTriplet);
      const totalDurMs = Math.round(beats * msPerBeat);

      // A) Actualizar la "Fuerza Actual" si esta nota indica un cambio
      if (note.dynamic && note.dynamic !== "none") {
        currentVelocity = DYNAMICS_MAP[note.dynamic];
      }

      // B) Traducir Notas (solo si no es silencio/fantasma)
      if (!note.duration.includes("r") && !note.isInvisible) {
        let activeDurMs = totalDurMs;
        // Articulaciones restan tiempo de contacto para soltar la tecla antes
        if (note.articulation === "a.") activeDurMs *= 0.4;
        if (note.articulation === "a>") activeDurMs *= 0.9;

        note.keys.forEach((key) => {
          const led = keyToLedIndex(key, keySig);
          if (led !== -1) {
            noteEvents.push({
              led,
              startMs: Math.round(currentMs),
              durMs: Math.round(activeDurMs),
              velocity: currentVelocity, // Hereda la dinámica pegajosa
            });
          }
        });
      }

      // C) Máquina de estados del Pedal
      if (note.pedal === "start" && !isPedalDown) {
        isPedalDown = true;
        pedalStartMs = currentMs;
      } else if (note.pedal === "stop" && isPedalDown) {
        isPedalDown = false;
        pedalEvents.push({
          startMs: Math.round(pedalStartMs),
          durMs: Math.round(currentMs - pedalStartMs),
        });
      }

      // Avanzar el reloj
      currentMs += totalDurMs;
    }

    // Si el pedal se quedó pisado al terminar la canción, lo soltamos
    if (isPedalDown) {
      pedalEvents.push({
        startMs: Math.round(pedalStartMs),
        durMs: Math.round(currentMs - pedalStartMs),
      });
    }
  });

  // Ordenar todo por orden de aparición cronológica para el ESP32
  noteEvents.sort((a, b) => a.startMs - b.startMs);

  return {
    notes: {
      leds: noteEvents.map((n) => n.led),
      starts: noteEvents.map((n) => n.startMs),
      durs: noteEvents.map((n) => n.durMs),
      vels: noteEvents.map((n) => n.velocity),
    },
    pedal: {
      starts: pedalEvents.map((p) => p.startMs),
      durs: pedalEvents.map((p) => p.durMs),
    },
  };
};
