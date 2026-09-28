// components/editor/NoteInputPanel.tsx
import React, { useRef, useState } from "react";
import * as Tone from "tone";

interface NoteInputPanelProps {
  rowOctaves: number[];
  changeRowOctave: (rowIndex: number, delta: number) => void;
  addSpecificNote: (noteKey: string, rowIndex: number, octave?: number) => void;
}

type PianoKeyData = {
  id: string;
  noteName: string;
  octave: number;
  kind: "white" | "black";
};

const NOTE_NAMES = [
  "c",
  "c#",
  "d",
  "d#",
  "e",
  "f",
  "f#",
  "g",
  "g#",
  "a",
  "a#",
  "b",
];

const buildPianoKeys = (): PianoKeyData[] => {
  const keys: PianoKeyData[] = [];

  for (let midi = 21; midi <= 108; midi += 1) {
    const noteName = NOTE_NAMES[midi % 12];
    const octave = Math.floor((midi - 12) / 12);
    keys.push({
      id: `${noteName}${octave}`,
      noteName,
      octave,
      kind: noteName.includes("#") ? "black" : "white",
    });
  }

  return keys;
};

const PIANO_KEYS = buildPianoKeys();

export function NoteInputPanel({
  rowOctaves,
  changeRowOctave,
  addSpecificNote,
}: NoteInputPanelProps) {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [inputMode, setInputMode] = useState<"buttons" | "keyboard">("buttons");
  const isDraggingRef = useRef(false);
  const synthRef = useRef<Tone.Synth | null>(null);

  const ensureSynth = async () => {
    if (!synthRef.current) {
      await Tone.start();
      synthRef.current = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.6 },
      }).toDestination();
      synthRef.current.volume.value = -6;
    }
    return synthRef.current;
  };

  const playKeyboardNote = async (keyData: PianoKeyData) => {
    const synth = await ensureSynth();
    const toneName = `${keyData.noteName.toUpperCase()}${keyData.octave}`;
    synth.triggerAttackRelease(toneName, "8n");
  };

  const handleKeyboardNote = (keyData: PianoKeyData) => {
    if (activeKeyId === keyData.id) return;
    addSpecificNote(keyData.noteName, 0, keyData.octave);
    void playKeyboardNote(keyData);
    setActiveKeyId(keyData.id);
  };

  const beginInteraction = (keyData: PianoKeyData) => {
    isDraggingRef.current = true;
    handleKeyboardNote(keyData);
  };

  const endInteraction = () => {
    isDraggingRef.current = false;
    setActiveKeyId(null);
  };

  const t = {
    title: language === "es" ? "Entrada de notas" : "Note input",
    subtitle:
      language === "es"
        ? "Elige entre el modo clásico de botones o el teclado visual."
        : "Choose between the classic button mode or the visual keyboard.",
    hide: language === "es" ? "⬆️ Ocultar" : "⬆️ Hide",
    show: language === "es" ? "⬇️ Mostrar" : "⬇️ Show",
    buttons: language === "es" ? "Botones" : "Buttons",
    keyboard: language === "es" ? "Teclado" : "Keyboard",
    octave: language === "es" ? "Octava" : "Octave",
    piano: language === "es" ? "Piano" : "Piano",
    pianoSubtitle:
      language === "es"
        ? "Vista de 2 octavas y scroll horizontal para recorrer las 88 teclas."
        : "Two-octave view with horizontal scrolling to explore all 88 keys.",
    keysLabel: language === "es" ? "teclas" : "keys",
    addNote: language === "es" ? "Añadir nota" : "Add note",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-orange-200 bg-orange-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-orange-700">
            {t.title}
          </p>
          <p className="text-sm font-semibold text-orange-900">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPanelVisible((prev) => !prev)}
            className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            {isPanelVisible ? t.hide : t.show}
          </button>
          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === "es" ? "en" : "es"))}
            className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            {language === "es" ? "EN" : "ES"}
          </button>
          <div className="inline-flex rounded-full border border-orange-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setInputMode("buttons")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${inputMode === "buttons" ? "bg-orange-600 text-white" : "text-orange-700 hover:bg-orange-100"}`}
            >
              {t.buttons}
            </button>
            <button
              type="button"
              onClick={() => setInputMode("keyboard")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${inputMode === "keyboard" ? "bg-orange-600 text-white" : "text-orange-700 hover:bg-orange-100"}`}
            >
              {t.keyboard}
            </button>
          </div>
        </div>
      </div>

      {isPanelVisible &&
        (inputMode === "buttons" ? (
          <div className="flex flex-col gap-3">
            {rowOctaves.map((octave, rowIndex) => (
              <div
                key={rowIndex}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex items-center justify-between gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 sm:min-w-[140px]">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700">
                    {t.octave}
                  </span>
                  <button
                    onClick={() => changeRowOctave(rowIndex, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-white font-bold text-orange-700 transition hover:bg-orange-100"
                  >
                    -
                  </button>
                  <span className="w-4 text-center font-black text-orange-900">
                    {octave}
                  </span>
                  <button
                    onClick={() => changeRowOctave(rowIndex, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-white font-bold text-orange-700 transition hover:bg-orange-100"
                  >
                    +
                  </button>
                </div>
                <div className="flex w-full flex-wrap gap-1.5">
                  {["c", "d", "e", "f", "g", "a", "b"].map(
                    (noteKey, noteIndex) => (
                      <button
                        key={`${rowIndex}-${noteKey}`}
                        type="button"
                        onClick={() => addSpecificNote(noteKey, rowIndex)}
                        className="min-w-[40px] flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"][noteIndex]}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 p-3 shadow-inner"
            onPointerLeave={endInteraction}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-300">
                  {t.piano}
                </p>
                <p className="text-sm font-semibold text-white">
                  {t.pianoSubtitle}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
                {rowOctaves[0]} · {PIANO_KEYS.length} {t.keysLabel}
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="relative flex min-w-[960px] items-start gap-0 pt-4">
                {PIANO_KEYS.map((keyData) => {
                  const isBlack = keyData.kind === "black";
                  return (
                    <button
                      key={keyData.id}
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        beginInteraction(keyData);
                      }}
                      onPointerEnter={() => {
                        if (
                          isDraggingRef.current &&
                          activeKeyId !== keyData.id
                        ) {
                          handleKeyboardNote(keyData);
                        }
                      }}
                      className={`relative flex-shrink-0 border transition-all ${
                        isBlack
                          ? "-ml-2.5 z-20 mt-0 h-24 w-5 rounded-b-md border-gray-700 bg-gradient-to-b from-gray-900 via-gray-800 to-black shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
                          : "z-10 h-32 w-8 rounded-b-xl border-gray-300 bg-gradient-to-b from-white via-gray-100 to-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                      } ${activeKeyId === keyData.id ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900" : ""}`}
                      aria-label={`${t.addNote} ${keyData.noteName}${keyData.octave}`}
                    >
                      {!isBlack && (
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-600">
                          {keyData.noteName === "c"
                            ? `C${keyData.octave}`
                            : keyData.noteName.toUpperCase()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
