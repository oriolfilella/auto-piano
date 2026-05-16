// src/utils/audioPlayer.ts
import * as Tone from "tone";
import { NoteData, getBeats } from "./musicLogic";

let synth: Tone.PolySynth | null = null;
let currentPart: Tone.Part | null = null;

export const initAudio = async () => {
  // Los navegadores obligan a iniciar el contexto de audio tras un clic del usuario
  await Tone.start();
  if (!synth) {
    // Usamos un PolySynth para poder tocar acordes (varias notas a la vez)
    synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3, // 🔥 CORREGIDO: sustain en lugar de sustained
        release: 1,
      },
    }).toDestination();
    synth.volume.value = -8; // Bajamos un poco el volumen para que no asuste
  }
};

export const playAudioPC = async (
  notesList: NoteData[],
  bpm: number,
  onComplete: () => void,
) => {
  await initAudio();
  if (!synth) return;

  // Limpiamos cualquier reproducción anterior
  stopAudioPC();

  // Aseguramos el tempo
  Tone.Transport.bpm.value = bpm;
  const beatDuration = 60 / bpm;

  const events: any[] = [];
  let currentTime = 0;

  notesList.forEach((note) => {
    const beats = getBeats(note.duration, note.isDotted, note.isTriplet);
    const durationInSeconds = beats * beatDuration;

    // Si NO es un silencio (r) y NO es invisible, la preparamos para sonar
    if (!note.duration.includes("r") && !note.isInvisible) {
      const toneKeys = note.keys
        .map((k) => {
          const [pitch, octave] = k.split("/");
          if (!octave) return null;
          // Convertimos 'c#/4' de VexFlow a 'C#4' de Tone.js
          const noteName = pitch.charAt(0).toUpperCase();
          const accidental = pitch.slice(1);
          const cleanAccidental = accidental === "n" ? "" : accidental; // Tone.js no usa 'n' para becuadro
          return `${noteName}${cleanAccidental}${octave}`;
        })
        .filter(Boolean) as string[];

      if (toneKeys.length > 0) {
        events.push({
          time: currentTime,
          notes: toneKeys,
          duration: durationInSeconds - 0.05, // Restamos un pelín para que las notas no se pisen (articulación)
        });
      }
    }
    currentTime += durationInSeconds; // Avanzamos el cursor de tiempo
  });

  // Creamos la "Partitura" de Tone.js
  currentPart = new Tone.Part((time, value) => {
    synth?.triggerAttackRelease(value.notes, value.duration, time);
  }, events).start(0);

  // Programamos cuándo debe detenerse (cuando acabe el tiempo total)
  Tone.Transport.scheduleOnce(() => {
    onComplete();
    Tone.Transport.stop();
  }, currentTime);

  // ¡A darle al Play!
  Tone.Transport.start();
};

export const stopAudioPC = () => {
  if (currentPart) {
    currentPart.dispose();
    currentPart = null;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel(); // Borra todos los eventos programados
  synth?.releaseAll(); // Apaga cualquier nota que se haya quedado sonando
};
