// components/editor/Header.tsx
import React from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../utils/superbaseClient';

interface HeaderProps {
  session: Session | null;
  isGuest: boolean;
  setIsGuest: (isGuest: boolean) => void;
  savedScores: any[];
  handleLoadScore: (scoreId: string) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  setTitle: (title: string) => void;
  saveScore: () => void;
  isSaving: boolean;
  connectionType: 'none' | 'usb' | 'ble';
  handleConnectUSB: () => void;
  handleConnectBLE: () => void;
}

export function Header({
  session,
  isGuest,
  setIsGuest,
  savedScores,
  handleLoadScore,
  handleFileUpload,
  title,
  setTitle,
  saveScore,
  isSaving,
  connectionType,
  handleConnectUSB,
  handleConnectBLE,
}: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm w-full">
      <select
        className="px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-blue-50 w-full sm:w-auto cursor-pointer outline-none"
        onChange={(e) => handleLoadScore(e.target.value)}
        defaultValue=""
        disabled={!session}
      >
        <option value="" disabled>
          {session ? "📂 Abrir Obra Guardada..." : "📂 Inicia sesión para abrir obras"}
        </option>
        {savedScores.map((score) => (
          <option key={score.id} value={score.id}>
            {score.title || "Sin título"} -{" "}
            {new Date(score.created_at).toLocaleDateString()}
          </option>
        ))}
      </select>

      <label className="flex-1 sm:flex-none px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap">
        📂 Importar XML
        <input type="file" accept=".musicxml,.xml" onChange={handleFileUpload} className="hidden" />
      </label>

      <input
        type="text"
        placeholder="Título de la obra..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="px-4 py-2.5 w-full sm:flex-1 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-800 text-lg text-center"
      />

      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={saveScore}
          disabled={isSaving}
          className={`flex-1 sm:flex-none px-6 py-2.5 font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 whitespace-nowrap ${session ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
        >
          {isSaving ? "⏳..." : "💾 Guardar"}
        </button>

        <button
          onClick={handleConnectUSB}
          disabled={connectionType === "ble"}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${connectionType === "usb" ? "bg-green-100 text-green-700 border-2 border-green-500" : "bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"}`}
        >
          {connectionType === "usb" ? "✅ USB" : "🔌 USB"}
        </button>

        <button
          onClick={handleConnectBLE}
          disabled={connectionType === "usb"}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${connectionType === "ble" ? "bg-blue-100 text-blue-700 border-2 border-blue-500" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"}`}
        >
          {connectionType === "ble" ? "✅ Bluetooth" : "🛜 Bluetooth"}
        </button>

        {session ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap bg-red-100 text-red-700 hover:bg-red-200 border-2 border-transparent"
          >
            🚪 Salir
          </button>
        ) : (
          <button
            onClick={() => setIsGuest(false)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-transparent"
          >
            👤 Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
