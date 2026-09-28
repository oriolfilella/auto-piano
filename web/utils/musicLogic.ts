// --- src/utils/musicLogic.ts ---

// --- Modifica el tipo ---
export type NoteData = {
  keys: string[];
  duration: string;
  clef: "treble" | "bass";
  isDotted?: boolean;
  manualTie?: boolean;
  tieNext?: boolean;
  originalIndex?: number;
  articulation?: string;
  voice?: number;
  isInvisible?: boolean;
  hasEndRepeat?: boolean;
  isTriplet?: boolean;
  textAnnotation?: string;
  dynamic?: string;
  pedal?: "start" | "stop";
  slur?: "start" | "stop";
};

export const signatureConfig: Record<
  string,
  { numBeats: number; beatValue: number; capacity: number }
> = {
  "4/4": { numBeats: 4, beatValue: 4, capacity: 4 },
  "3/4": { numBeats: 3, beatValue: 4, capacity: 3 },
  "2/2": { numBeats: 2, beatValue: 2, capacity: 2 },
};

export const parseTimeSignature = (sig: string) => {
  // 1. Si es uno de los básicos (4/4, 3/4), usamos el que ya tenías
  const predefined = signatureConfig[sig];
  if (predefined) return predefined;

  // 2. Si es uno inventado (ej. 7/8), separamos los números
  const parts = sig.split("/");
  const numBeats = parseInt(parts[0], 10);
  const beatValue = parseInt(parts[1], 10);

  // 3. Sistema de seguridad: Si está incompleto, usamos 4/4 temporalmente
  if (isNaN(numBeats) || isNaN(beatValue) || beatValue === 0) {
    return { numBeats: 4, beatValue: 4, capacity: 4 };
  }

  // 4. Calculamos la capacidad real matemática
  return {
    numBeats,
    beatValue,
    capacity: numBeats * (4 / beatValue),
  };
};

export const getBeats = (
  duration: string,
  isDotted: boolean = false,
  isTriplet: boolean = false,
) => {
  let beats = 0;
  const baseDur = duration.replace("r", "").replace("d", "");

  if (baseDur === "w") beats = 4;
  else if (baseDur === "h") beats = 2;
  else if (baseDur === "q") beats = 1;
  else if (baseDur === "8") beats = 0.5;
  else if (baseDur === "16") beats = 0.25;
  else if (baseDur === "32") beats = 0.125;

  if (isDotted) beats *= 1.5;

  // ✨ MAGIA MATEMÁTICA: Si es un tresillo, vale 2/3 de su valor normal
  if (isTriplet) beats *= 2 / 3;

  return beats;
};

export const getDurations = (beats: number): string[] => {
  let remaining = beats;
  const durations: string[] = [];

  // 🔥 Bajamos el límite a 0.125 para que entre al bucle con las fusas
  while (remaining >= 0.125) {
    // Redondeamos a 3 decimales para evitar bugs de precisión de JavaScript con fracciones pequeñas
    remaining = Math.round(remaining * 1000) / 1000;

    if (remaining >= 4) {
      durations.push("w");
      remaining -= 4;
    } else if (remaining >= 2) {
      durations.push("h");
      remaining -= 2;
    } else if (remaining >= 1) {
      durations.push("q");
      remaining -= 1;
    } else if (remaining >= 0.5) {
      durations.push("8");
      remaining -= 0.5;
    } else if (remaining >= 0.25) {
      durations.push("16");
      remaining -= 0.25;
    } else if (remaining >= 0.125) {
      durations.push("32");
      remaining -= 0.125;
    } else {
      break;
    }
  }
  return durations;
};

export const calculateMeasures = (
  clefNotes: NoteData[],
  timeSignature: string,
) => {
  const config = parseTimeSignature(timeSignature);
  const measures: (NoteData & { tieNext?: boolean })[][] = [];
  let currentMeasure: (NoteData & { tieNext?: boolean })[] = [];
  let currentBeats = 0;

  for (let j = 0; j < clefNotes.length; j++) {
    const note = clefNotes[j];

    // 🔥 CORRECCIÓN 1: Le pasamos note.isTriplet al calculador
    let noteBeats = getBeats(note.duration, note.isDotted, note.isTriplet);
    const isRest = note.duration.includes("r");

    if (isRest) {
      if (
        currentBeats + noteBeats > config.capacity &&
        currentMeasure.length > 0
      ) {
        measures.push(currentMeasure);
        currentMeasure = [note];
        currentBeats = noteBeats;
      } else {
        currentMeasure.push(note);
        currentBeats += noteBeats;
      }
      continue;
    }

    while (noteBeats > 0) {
      // Redondeamos para evitar el famoso error de 0.9999999 de JavaScript
      const spaceLeft =
        Math.round((config.capacity - currentBeats) * 1000) / 1000;

      if (spaceLeft <= 0) {
        measures.push(currentMeasure);
        currentMeasure = [];
        currentBeats = 0;
        continue;
      }

      if (Math.round(noteBeats * 1000) / 1000 <= spaceLeft) {
        // 🔥 CORRECCIÓN 2: Le pasamos note.isTriplet aquí también
        if (
          noteBeats === getBeats(note.duration, note.isDotted, note.isTriplet)
        ) {
          currentMeasure.push({ ...note, tieNext: note.manualTie || false });
        } else {
          const chunks = getDurations(noteBeats);
          chunks.forEach((chunkDur, idx) => {
            currentMeasure.push({
              ...note,
              duration: chunkDur,
              isDotted: false,
              tieNext: idx < chunks.length - 1 || note.manualTie || false,
            });
          });
        }
        currentBeats += noteBeats;
        noteBeats = 0;
      } else {
        const chunksThatFit = getDurations(spaceLeft);
        chunksThatFit.forEach((chunkDur) => {
          currentMeasure.push({
            ...note,
            duration: chunkDur,
            isDotted: false,
            tieNext: true,
          });
        });
        noteBeats -= spaceLeft;
        currentBeats += spaceLeft;
        measures.push(currentMeasure);
        currentMeasure = [];
        currentBeats = 0;
      }
    }
  }
  if (currentMeasure.length > 0 || measures.length === 0)
    measures.push(currentMeasure);
  return measures;
};

export const KEY_SIGNATURES: Record<string, Record<string, string>> = {
  C: {},
  G: { f: "#" },
  D: { f: "#", c: "#" },
  A: { f: "#", c: "#", g: "#" },
  E: { f: "#", c: "#", g: "#", d: "#" },
  F: { b: "b" },
  Bb: { b: "b", e: "b" },
  Eb: { b: "b", e: "b", a: "b" },
  Ab: { b: "b", e: "b", a: "b", d: "b" },
  // Puedes añadir más según necesites
};
