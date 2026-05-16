// src/utils/audioPlayer.ts
import * as Tone from "tone";
import { NoteData, getBeats } from "./musicLogic";

let synth: Tone.PolySynth | null = null;
let currentPart: Tone.Part | null = null;

// 🔥 1. EL CÍRCULO DE QUINTAS: Enseñamos al PC qué notas alterar según la armadura
const keyAccidentals: Record<string, Record<string, string>> = {
  C: {},
  Am: {},
  G: { f: "#" },
  Em: { f: "#" },
  D: { f: "#", c: "#" },
  Bm: { f: "#", c: "#" },
  A: { f: "#", c: "#", g: "#" },
  "F#m": { f: "#", c: "#", g: "#" },
  E: { f: "#", c: "#", g: "#", d: "#" },
  "C#m": { f: "#", c: "#", g: "#", d: "#" },
  B: { f: "#", c: "#", g: "#", d: "#", a: "#" },
  "G#m": { f: "#", c: "#", g: "#", d: "#", a: "#" },
  "F#": { f: "#", c: "#", g: "#", d: "#", a: "#", e: "#" },
  "D#m": { f: "#", c: "#", g: "#", d: "#", a: "#", e: "#" },
  F: { b: "b" },
  Dm: { b: "b" },
  Bb: { b: "b", e: "b" },
  Gm: { b: "b", e: "b" },
  Eb: { b: "b", e: "b", a: "b" },
  Cm: { b: "b", e: "b", a: "b" },
  Ab: { b: "b", e: "b", a: "b", d: "b" },
  Fm: { b: "b", e: "b", a: "b", d: "b" },
  Db: { b: "b", e: "b", a: "b", d: "b", g: "b" },
  Bbm: { b: "b", e: "b", a: "b", d: "b", g: "b" },
  Gb: { b: "b", e: "b", a: "b", d: "b", g: "b", c: "b" },
  Ebm: { b: "b", e: "b", a: "b", d: "b", g: "b", c: "b" },
};

const applyKeySignature = (pitch: string, keySig: string) => {
  const noteName = pitch.charAt(0).toLowerCase();
  const explicitAccidental = pitch.slice(1);

  // Si el usuario puso una alteración explícita (ej. c#, cb o cn para becuadro), manda eso
  if (explicitAccidental) {
    return explicitAccidental === "n"
      ? noteName.toUpperCase()
      : `${noteName.toUpperCase()}${explicitAccidental}`;
  }

  // Si no, miramos si la armadura afecta a esta nota
  const keyMapping = keyAccidentals[keySig];
  if (keyMapping && keyMapping[noteName]) {
    return `${noteName.toUpperCase()}${keyMapping[noteName]}`;
  }

  return noteName.toUpperCase();
};

export const initAudio = async () => {
  await Tone.start();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
    }).toDestination();
    synth.volume.value = -6;
  }
};

export const playAudioPC = async (
  notesList: NoteData[],
  bpm: number,
  keySignature: string, // 🔥 AHORA RECIBE LA ARMADURA
  onComplete: () => void,
) => {
  await initAudio();
  if (!synth) return;

  stopAudioPC();

  Tone.Transport.bpm.value = bpm;
  const beatDuration = 60 / bpm;

  const events: any[] = [];
  let maxTime = 0;

  // 🔥 2. POLIFONÍA: Cronómetros separados para cada clave y voz
  const trackers: Record<string, number> = {};

  notesList.forEach((note) => {
    const beats = getBeats(note.duration, note.isDotted, note.isTriplet);
    const durationInSeconds = beats * beatDuration;

    // Identificamos el "carril" (ej: treble-1, bass-2)
    const trackKey = `${note.clef || "treble"}-${note.voice || 1}`;
    if (trackers[trackKey] === undefined) trackers[trackKey] = 0;

    const currentTime = trackers[trackKey];

    if (!note.duration.includes("r") && !note.isInvisible) {
      const toneKeys = note.keys
        .map((k) => {
          const [pitch, octave] = k.split("/");
          if (!octave) return null;
          const finalPitch = applyKeySignature(pitch, keySignature);
          return `${finalPitch}${octave}`;
        })
        .filter(Boolean) as string[];

      // 🔥 3. ARTICULACIONES: Calculamos la duración exacta y el volumen
      let playDuration = durationInSeconds * 0.95; // Por defecto casi legato
      let velocity = 0.7; // Volumen normal

      if (note.articulation === "a.") {
        playDuration = durationInSeconds * 0.4; // Staccato (muy corto)
      } else if (note.articulation === "a-") {
        playDuration = durationInSeconds * 1.0; // Tenuto (sostenido hasta el final)
      } else if (note.articulation === "a>") {
        velocity = 1.0; // Acento (golpe fuerte)
      } else if (note.articulation === "a^") {
        playDuration = durationInSeconds * 0.8;
        velocity = 1.0; // Marcato (fuerte y separado)
      }

      if (toneKeys.length > 0) {
        events.push({
          time: currentTime,
          notes: toneKeys,
          duration: playDuration,
          velocity: velocity, // Pasamos la fuerza del golpe
        });
      }
    }

    // Avanzamos el cronómetro solo de ESTE carril
    trackers[trackKey] += durationInSeconds;

    // Guardamos el tiempo total de la pieza
    if (trackers[trackKey] > maxTime) {
      maxTime = trackers[trackKey];
    }
  });

  currentPart = new Tone.Part((time, value) => {
    synth?.triggerAttackRelease(
      value.notes,
      value.duration,
      time,
      value.velocity,
    );
  }, events).start(0);

  Tone.Transport.scheduleOnce(() => {
    onComplete();
    Tone.Transport.stop();
  }, maxTime);

  Tone.Transport.start();
};

export const stopAudioPC = () => {
  if (currentPart) {
    currentPart.dispose();
    currentPart = null;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel();
  synth?.releaseAll();
};
