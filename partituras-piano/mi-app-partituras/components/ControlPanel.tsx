// src/components/ControlPanel.tsx
import React from "react";

export interface ControlPanelProps {
  activeClef: "treble" | "bass";
  setActiveClef: (clef: "treble" | "bass") => void;
  activeVoice: number;
  setActiveVoice: (voice: number) => void;
  currentDuration: string;
  setDurationAndEdit: (d: string) => void;
  isDotActive: boolean;
  toggleDot: () => void;
  isTieActive: boolean;
  toggleTie: () => void;
  isTripletActive: boolean;
  toggleTriplet: () => void;
  accidental: string;
  toggleAccidental: (acc: "#" | "b" | "n") => void;
  isChordMode: boolean;
  setIsChordMode: (val: boolean) => void;
  toggleRepeat: () => void;
  isRepeatActive: boolean;
  dynamic: string;
  setDynamic: (d: string) => void;
  textAnnotation: string;
  setTextAnnotation: (t: string) => void;
  applyTextAnnotation: () => void;
  togglePedal: (type: "start" | "stop") => void;
  articulation: string;
  setArticulation: (art: string) => void;
  timeSignature: string;
  setTimeSignature: (ts: string) => void;
  keySignature: string;
  setKeySignature: (ks: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  onDebugHardware: () => void;
}

export const ControlPanel = (props: ControlPanelProps) => {
  return (
    <div className="flex flex-col gap-6 w-full pb-6">
      {/* 1. CLAVES Y VOCES */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => props.setActiveClef("treble")}
          className={`flex-1 py-1.5 rounded-lg font-bold border-2 ${props.activeClef === "treble" ? "border-blue-500 bg-blue-50 text-blue-700" : "bg-white text-gray-600 border-gray-200"}`}
        >
          𝄞 Sol
        </button>
        <button
          onClick={() => props.setActiveClef("bass")}
          className={`flex-1 py-1.5 rounded-lg font-bold border-2 ${props.activeClef === "bass" ? "border-blue-500 bg-blue-50 text-blue-700" : "bg-white text-gray-600 border-gray-200"}`}
        >
          𝄢 Fa
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => props.setActiveVoice(1)}
          className={`flex-1 py-1.5 rounded-lg font-bold border-2 ${props.activeVoice === 1 ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "bg-white text-gray-600 border-gray-200"}`}
        >
          1️⃣ Voz 1
        </button>
        <button
          onClick={() => props.setActiveVoice(2)}
          className={`flex-1 py-1.5 rounded-lg font-bold border-2 ${props.activeVoice === 2 ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "bg-white text-gray-600 border-gray-200"}`}
        >
          2️⃣ Voz 2
        </button>
      </div>

      {/* 2. AJUSTES GLOBALES */}
      <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl shadow-inner text-sm w-full">
        {/* 🔥 AHORA ES UNA CUADRÍCULA DE 3 COLUMNAS PARA METER EL BPM */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col bg-white p-2 rounded border border-gray-300 flex-1 min-w-0">
            <span className="font-bold text-[10px] text-gray-500 mb-1">
              COMPÁS
            </span>
            <input
              type="text"
              value={props.timeSignature}
              onChange={(e) => props.setTimeSignature(e.target.value)}
              className="w-full bg-transparent font-bold text-gray-900 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col bg-white p-2 rounded border border-gray-300 flex-1 min-w-0">
            <span className="font-bold text-[10px] text-gray-500 mb-1">
              BPM
            </span>
            <input
              type="number"
              min="10"
              max="300"
              value={props.bpm}
              onChange={(e) => props.setBpm(Number(e.target.value) || 0)}
              className="w-full bg-transparent font-bold text-gray-900 outline-none text-sm"
            />
          </div>

          <div className="flex flex-col bg-white p-2 rounded border border-gray-300 overflow-hidden flex-1 min-w-0">
            <span className="font-bold text-[10px] text-gray-500 mb-1">
              TONALIDAD
            </span>
            <select
              value={props.keySignature}
              onChange={(e) => props.setKeySignature(e.target.value)}
              className="w-full bg-transparent font-bold text-gray-900 outline-none cursor-pointer text-xs"
            >
              <option value="C">Do/Lam (0)</option>
              <option value="G">Sol/Mim (1#)</option>
              <option value="D">Re/Sim (2#)</option>
              <option value="F">Fa/Rem (1b)</option>
              <option value="Bb">Si♭/Solm (2b)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col bg-white p-2 rounded border border-gray-300 overflow-hidden flex-1 min-w-0">
            <span className="font-bold text-[10px] text-gray-500 mb-1">
              ARTICULACIÓN
            </span>
            <select
              title="Atajos: [ . ] Staccato | [ - ] Tenuto | [ V ] Acento | [ M ] Marcato | [ X ] Ninguna"
              value={props.articulation}
              onChange={(e) => props.setArticulation(e.target.value)}
              className="w-full bg-transparent font-bold text-gray-900 outline-none cursor-pointer text-xs"
            >
              <option value="none">Ninguna</option>
              <option value="a.">Staccato (.)</option>
              <option value="a-">Tenuto (-)</option>
              <option value="a>">Acento (&gt;)</option>
              <option value="a^">Marcato (^)</option>
            </select>
          </div>

          <div className="flex flex-col bg-white p-2 rounded border border-gray-300 overflow-hidden flex-1 min-w-0">
            <span className="font-bold text-[10px] text-gray-500 mb-1">
              DINÁMICA
            </span>
            <select
              value={props.dynamic}
              onChange={(e) => props.setDynamic(e.target.value)}
              className="w-full bg-transparent font-bold text-gray-900 outline-none cursor-pointer italic text-xs"
            >
              <option value="none">Ninguna</option>
              <option value="p">p (Piano)</option>
              <option value="mp">mp (Mezzopiano)</option>
              <option value="mf">mf (Mezzoforte)</option>
              <option value="f">f (Forte)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          <input
            type="text"
            placeholder="Ej: Allegro"
            value={props.textAnnotation}
            onChange={(e) => props.setTextAnnotation(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 text-gray-900 font-bold rounded text-sm outline-none focus:border-blue-500 w-full min-w-0"
          />
          <button
            onClick={props.applyTextAnnotation}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded border border-blue-200 hover:bg-blue-200 text-xs flex-shrink-0"
          >
            Txt
          </button>
        </div>

        <div className="flex gap-2 w-full mt-1">
          <button
            onClick={() => props.togglePedal("start")}
            className="flex-1 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs font-bold hover:bg-gray-100 text-gray-700"
          >
            Ped. ↓
          </button>
          <button
            onClick={() => props.togglePedal("stop")}
            className="flex-1 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs font-bold hover:bg-gray-100 text-gray-700"
          >
            Ped. ↑
          </button>
        </div>
      </div>

      {/* 3. FIGURAS Y MODIFICADORES RÍTMICOS */}
      <div className="flex flex-wrap gap-2">
        {["w", "h", "q", "8", "16", "32"].map((dur, index) => {
          const labels: Record<string, string> = {
            w: "w",
            h: "h",
            q: "q",
            "8": "♪",
            "16": "𝅘𝅥𝅯",
            "32": "𝅘𝅥𝅰",
          };
          return (
            <button
              key={dur}
              title={`Atajo: Tecla ${index + 1}`}
              onClick={() => props.setDurationAndEdit(dur)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.currentDuration === dur ? "border-blue-500 bg-blue-50 text-blue-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {labels[dur]}
            </button>
          );
        })}

        <button
          title="Atajo: Tecla D"
          onClick={props.toggleDot}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.isDotActive ? "border-blue-500 bg-blue-50 text-blue-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          •
        </button>
        <button
          title="Atajo: Tecla T"
          onClick={props.toggleTie}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.isTieActive ? "border-green-500 bg-green-50 text-green-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          ‿
        </button>
        <button
          onClick={props.toggleTriplet}
          className={`px-2 h-9 flex items-center justify-center rounded-lg border-2 font-bold text-xs shrink-0 ${props.isTripletActive ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          [ 3 ]
        </button>
      </div>

      {/* 4. ALTERACIONES, ACORDE Y REPETIR */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
        <button
          title="Atajo: Tecla S"
          onClick={() => props.toggleAccidental("#")}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.accidental === "#" ? "border-purple-500 bg-purple-50 text-purple-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          ♯
        </button>
        <button
          title="Atajo: Tecla F"
          onClick={() => props.toggleAccidental("b")}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.accidental === "b" ? "border-purple-500 bg-purple-50 text-purple-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          ♭
        </button>
        <button
          title="Atajo: Tecla N"
          onClick={() => props.toggleAccidental("n")}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border-2 font-bold shrink-0 ${props.accidental === "n" ? "border-purple-500 bg-purple-50 text-purple-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          ♮
        </button>

        <button
          title="Atajo: Mantén pulsado Shift o A"
          onClick={() => props.setIsChordMode(!props.isChordMode)}
          className={`px-3 h-9 flex items-center justify-center rounded-lg border-2 font-bold text-xs shrink-0 ${props.isChordMode ? "border-orange-500 bg-orange-50 text-orange-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          🎹 Acorde
        </button>
        <button
          onClick={props.toggleRepeat}
          className={`px-3 h-9 flex items-center justify-center rounded-lg border-2 font-bold text-xs shrink-0 ${props.isRepeatActive ? "border-red-500 bg-red-50 text-red-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          :|| Repetir
        </button>
      </div>

      {/* 5. BOTÓN DE HARDWARE */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={props.onDebugHardware}
          className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg shadow-sm hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm"
        >
          🖨️ Ver Código Hardware
        </button>
      </div>
    </div>
  );
};
