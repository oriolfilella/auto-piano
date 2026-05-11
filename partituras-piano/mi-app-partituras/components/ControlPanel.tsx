// src/components/ControlPanel.tsx
"use client";
import React, { useState } from "react";

interface ControlPanelProps {
  activeClef: "treble" | "bass";
  setActiveClef: (c: "treble" | "bass") => void;
  rowOctaves: number[];
  changeRowOctave: (rowIndex: number, delta: number) => void;
  addSpecificNote: (key: string, rowIndex: number) => void;
  currentDuration: string;
  setDurationAndEdit: (d: string) => void;
  isDotActive: boolean;
  toggleDot: () => void;
  isTieActive: boolean;
  toggleTie: () => void;
  accidental: string;
  toggleAccidental: (a: "#" | "b") => void;
  isChordMode: boolean;
  setIsChordMode: (b: boolean) => void;
  addRest: () => void;
  undoLastNote: () => void;
  clearAll: () => void;
  selectedNoteIndex: number | null;
  timeSignature: string;
  setTimeSignature: (ts: string) => void;
  keySignature: string;
  setKeySignature: (ks: string) => void;
  articulation: string;
  setArticulation: (art: string) => void;
}

const notesUI = [
  { name: "Do", key: "c" },
  { name: "Re", key: "d" },
  { name: "Mi", key: "e" },
  { name: "Fa", key: "f" },
  { name: "Sol", key: "g" },
  { name: "La", key: "a" },
  { name: "Si", key: "b" },
];

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col text-gray-900 sticky top-4 z-50 transition-all">
      {/* CABECERA DESPLEGABLE */}
      <div
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
          🛠️ Herramientas de Edición
        </h3>
        <button className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 transition-colors">
          {isExpanded ? "▲ Ocultar" : "▼ Mostrar"}
        </button>
      </div>

      {/* CONTENIDO */}
      {isExpanded && (
        <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-gray-100 animate-fade-in">
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => props.setActiveClef("treble")}
                  className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${props.activeClef === "treble" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}
                >
                  𝄞 Sol
                </button>
                <button
                  onClick={() => props.setActiveClef("bass")}
                  className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${props.activeClef === "bass" ? "bg-white text-purple-600 shadow" : "text-gray-500"}`}
                >
                  𝄢 Fa
                </button>
              </div>

              <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-xl border border-green-100">
                <span className="text-[10px] font-bold text-green-700 uppercase">
                  Compás
                </span>
                <input
                  type="text"
                  value={props.timeSignature}
                  onChange={(e) => props.setTimeSignature(e.target.value)}
                  className="w-14 text-center bg-white border border-green-200 rounded-lg font-bold text-green-800 focus:ring-2 focus:ring-green-400 focus:outline-none transition-all"
                  placeholder="4/4"
                />
              </div>

              <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-purple-700 uppercase">
                  Tonalidad
                </span>
                <select
                  value={props.keySignature}
                  onChange={(e) => props.setKeySignature(e.target.value)}
                  className="bg-white border border-purple-200 rounded-lg font-bold text-purple-800 text-xs p-1"
                >
                  <option value="C">Do May / La min</option>
                  <option value="G">Sol May (1#)</option>
                  <option value="D">Re May (2#)</option>
                  <option value="A">La May (3#)</option>
                  <option value="E">Mi May (4#)</option>
                  <option value="F">Fa May (1b)</option>
                  <option value="Bb">Si b May (2b)</option>
                  <option value="Eb">Mi b May (3b)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-teal-50 px-3 py-1 rounded-xl border border-teal-100">
              <span className="text-[10px] font-bold text-teal-700 uppercase">
                Articulación
              </span>
              <select
                value={props.articulation}
                onChange={(e) => props.setArticulation(e.target.value)}
                className="bg-white border border-teal-200 rounded-lg font-bold text-teal-800 text-xs p-1 focus:ring-2 focus:ring-teal-400 focus:outline-none"
              >
                <option value="none">Normal (Sin art.)</option>
                <option value="a.">Staccato (.)</option>
                <option value="a>">Acento (&gt;)</option>
                <option value="a^">Marcato (^)</option>
                <option value="a-">Tenuto (-)</option>
                <option value="a@a">Calderón (𝄐)</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {["w", "h", "q", "8", "16", "32"].map((dur) => (
                <button
                  key={dur}
                  onClick={() => props.setDurationAndEdit(dur)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${props.currentDuration === dur ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"}`}
                >
                  {dur.toUpperCase()}
                </button>
              ))}
              <button
                onClick={props.toggleDot}
                className={`px-2.5 py-1 rounded-md border-2 text-xs ${props.isDotActive ? "border-blue-500 bg-blue-100 text-blue-700" : "bg-gray-200"}`}
              >
                •
              </button>
              <button
                onClick={props.toggleTie}
                className={`px-2.5 py-1 rounded-md border-2 text-xs ${props.isTieActive ? "border-green-500 bg-green-100 text-green-700" : "bg-gray-200"}`}
              >
                ‿
              </button>
              <button
                onClick={() => props.toggleAccidental("#")}
                className={`px-2.5 py-1 rounded-md border-2 text-xs font-bold ${props.accidental === "#" ? "border-purple-500 bg-purple-100 text-purple-700" : "bg-gray-200"}`}
              >
                ♯
              </button>
              <button
                onClick={() => props.toggleAccidental("b")}
                className={`px-2.5 py-1 rounded-md border-2 text-xs font-bold ${props.accidental === "b" ? "border-purple-500 bg-purple-100 text-purple-700" : "bg-gray-200"}`}
              >
                ♭
              </button>
              <button
                onClick={() => props.setIsChordMode(!props.isChordMode)}
                className={`px-3 py-1 rounded-md font-bold border-2 text-xs ${props.isChordMode ? "border-orange-500 bg-orange-100 text-orange-700" : "bg-gray-200"}`}
              >
                🎹 Acorde
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map((rowIndex) => (
              <div
                key={rowIndex}
                className="flex flex-col md:flex-row items-center gap-2 bg-gray-50 p-1.5 md:p-2 rounded-xl border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 min-w-[130px] justify-center">
                  <span className="text-[10px] font-bold text-orange-700 uppercase">
                    Octava
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => props.changeRowOctave(rowIndex, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-orange-300 rounded-lg text-orange-700 font-bold hover:bg-orange-100"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-black text-orange-900">
                      {props.rowOctaves[rowIndex]}
                    </span>
                    <button
                      onClick={() => props.changeRowOctave(rowIndex, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white border border-orange-300 rounded-lg text-orange-700 font-bold hover:bg-orange-100"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 flex-1 w-full">
                  {notesUI.map((n) => (
                    <button
                      key={n.name}
                      onClick={() => props.addSpecificNote(n.key, rowIndex)}
                      className={`py-1.5 md:py-2 border-2 rounded-xl font-bold text-gray-800 transition-all active:scale-95 text-xs md:text-sm bg-white hover:shadow-md ${props.activeClef === "treble" ? "border-blue-100 hover:border-blue-500 hover:text-blue-700" : "border-purple-100 hover:border-purple-500 hover:text-purple-700"}`}
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            <button
              onClick={props.addRest}
              className="py-2 bg-gray-800 text-white rounded-xl font-bold text-xs md:text-sm"
            >
              𝄽 Silencio
            </button>
            <button
              onClick={props.undoLastNote}
              className={`py-2 text-white rounded-xl font-bold text-xs md:text-sm transition-colors ${props.selectedNoteIndex !== null ? "bg-red-600 hover:bg-red-700" : "bg-yellow-500 hover:bg-yellow-600"}`}
            >
              {props.selectedNoteIndex !== null
                ? "🗑️ Borrar Nota"
                : "↩️ Deshacer"}
            </button>
            <button
              onClick={props.clearAll}
              className="py-2 bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm"
            >
              🗑️ Limpiar Todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
