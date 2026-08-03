// components/editor/NoteInputPanel.tsx
import React from 'react';

interface NoteInputPanelProps {
  rowOctaves: number[];
  changeRowOctave: (rowIndex: number, delta: number) => void;
  addSpecificNote: (noteKey: string, rowIndex: number) => void;
}

export function NoteInputPanel({ rowOctaves, changeRowOctave, addSpecificNote }: NoteInputPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {rowOctaves.map((octave, rowIndex) => (
        <div key={rowIndex} className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 w-full sm:w-auto shrink-0">
            <span className="text-xs font-bold text-orange-700">OCTAVA</span>
            <button onClick={() => changeRowOctave(rowIndex, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-orange-600 font-bold border border-orange-300 hover:bg-orange-100 transition">-</button>
            <span className="font-bold text-orange-900 w-4 text-center">{octave}</span>
            <button onClick={() => changeRowOctave(rowIndex, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-orange-600 font-bold border border-orange-300 hover:bg-orange-100 transition">+</button>
          </div>
          <div className="flex w-full gap-1.5 flex-wrap">
            {["c", "d", "e", "f", "g", "a", "b"].map((noteKey, noteIndex) => (
              <button
                key={noteKey}
                onClick={() => addSpecificNote(noteKey, rowIndex)}
                className="flex-1 min-w-[40px] py-2 bg-white border border-gray-300 rounded-lg shadow-sm font-bold text-gray-700 text-sm sm:text-base hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all focus:ring-2 focus:ring-blue-500"
              >
                {["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"][noteIndex]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
