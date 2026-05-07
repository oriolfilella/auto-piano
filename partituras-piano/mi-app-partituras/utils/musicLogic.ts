// --- src/utils/musicLogic.ts ---

// --- Modifica el tipo ---
export type NoteData = {
  keys: string[]; // <-- CAMBIO: ahora es un array de strings
  duration: string;
  clef: "treble" | "bass";
  isDotted?: boolean;
  manualTie?: boolean;
};

export const signatureConfig: Record<
  string,
  { numBeats: number; beatValue: number; capacity: number }
> = {
  "4/4": { numBeats: 4, beatValue: 4, capacity: 4 },
  "3/4": { numBeats: 3, beatValue: 4, capacity: 3 },
  "2/2": { numBeats: 2, beatValue: 2, capacity: 2 },
};

export const getBeats = (duration: string, isDotted?: boolean): number => {
  const pureDuration = duration.replace("r", "");
  const map: Record<string, number> = { w: 4, h: 2, q: 1, "8": 0.5 };
  const baseBeats = map[pureDuration] || 1;
  return isDotted ? baseBeats * 1.5 : baseBeats;
};

export const getDurations = (beats: number): string[] => {
  let remaining = beats;
  const durations: string[] = [];
  while (remaining >= 0.5) {
    remaining = Math.round(remaining * 100) / 100;
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
    }
  }
  return durations;
};

export const calculateMeasures = (
  clefNotes: NoteData[],
  timeSignature: string,
) => {
  const config = signatureConfig[timeSignature];
  const measures: (NoteData & { tieNext?: boolean })[][] = [];
  let currentMeasure: (NoteData & { tieNext?: boolean })[] = [];
  let currentBeats = 0;

  for (let j = 0; j < clefNotes.length; j++) {
    const note = clefNotes[j];
    let noteBeats = getBeats(note.duration, note.isDotted);
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
      const spaceLeft = config.capacity - currentBeats;

      if (spaceLeft <= 0) {
        measures.push(currentMeasure);
        currentMeasure = [];
        currentBeats = 0;
        continue;
      }

      if (noteBeats <= spaceLeft) {
        if (noteBeats === getBeats(note.duration, note.isDotted)) {
          // NUEVO: Si la nota cabe intacta, miramos si el usuario forzó la ligadura
          currentMeasure.push({ ...note, tieNext: note.manualTie || false });
        } else {
          const chunks = getDurations(noteBeats);
          chunks.forEach((chunkDur, idx) => {
            currentMeasure.push({
              ...note,
              duration: chunkDur,
              isDotted: false,
              // NUEVO: El último trocito de una nota subdividida hereda la ligadura manual
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
