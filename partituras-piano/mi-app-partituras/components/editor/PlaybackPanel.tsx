// components/editor/PlaybackPanel.tsx
import React from 'react';

interface PlaybackPanelProps {
  isPlayingPC: boolean;
  handlePlayPC: () => void;
  isPlaying: boolean;
  handlePlay: () => void;
  connectionType: 'none' | 'usb' | 'ble';
  addRest: () => void;
  undoLastNote: () => void;
  clearScore: () => void;
}

export function PlaybackPanel({
  isPlayingPC,
  handlePlayPC,
  isPlaying,
  handlePlay,
  connectionType,
  addRest,
  undoLastNote,
  clearScore,
}: PlaybackPanelProps) {
  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
      <button
        onClick={handlePlayPC}
        className={`flex-1 min-w-[140px] py-2.5 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm ${isPlayingPC ? "bg-orange-100 text-orange-700 border-2 border-orange-500 hover:bg-orange-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}
      >
        {isPlayingPC ? "⏹️ Detener Audio" : "🎧 Escuchar en PC"}
      </button>
      <button
        onClick={handlePlay}
        disabled={connectionType === "none"}
        className={`flex-1 min-w-[140px] py-2.5 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm ${isPlaying ? "bg-red-100 text-red-700 border-2 border-red-500 hover:bg-red-200" : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"}`}
      >
        {isPlaying ? "⏹️ Detener Reproducción" : "▶️ Reproducir en Piano"}
      </button>
      <button onClick={addRest} className="flex-1 min-w-[100px] py-2.5 bg-gray-800 text-white font-bold rounded-xl shadow hover:bg-gray-900 transition flex items-center justify-center gap-2 text-sm">
        𝄽 Silencio
      </button>
      <button onClick={undoLastNote} className="flex-1 min-w-[100px] py-2.5 bg-yellow-500 text-white font-bold rounded-xl shadow hover:bg-yellow-600 transition flex items-center justify-center gap-2 text-sm">
        ↩️ Deshacer
      </button>
      <button
        onClick={clearScore}
        className="flex-1 min-w-[100px] py-2.5 bg-red-500 text-white font-bold rounded-xl shadow hover:bg-red-600 transition flex items-center justify-center gap-2 text-sm"
      >
        🗑️ Limpiar Todo
      </button>
    </div>
  );
}
