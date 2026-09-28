// components/editor/Header.tsx
import React, { useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../../utils/superbaseClient";

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
  connectionType: "none" | "usb" | "ble";
  handleConnectUSB: () => void;
  handleConnectBLE: () => void;
  isHeaderVisible: boolean;
  toggleHeaderVisibility: () => void;
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
  isHeaderVisible,
  toggleHeaderVisibility,
}: HeaderProps) {
  const [language, setLanguage] = useState<"es" | "en">("es");

  const t = {
    hideHeader: language === "es" ? "⬆️ Ocultar encabezado" : "⬆️ Hide header",
    showHeader: language === "es" ? "⬇️ Mostrar encabezado" : "⬇️ Show header",
    openSaved:
      language === "es"
        ? "📂 Abrir Obra Guardada..."
        : "📂 Open Saved Score...",
    openGuest:
      language === "es"
        ? "📂 Inicia sesión para abrir obras"
        : "📂 Sign in to open scores",
    importXml: language === "es" ? "📂 Importar XML" : "📂 Import XML",
    titlePlaceholder:
      language === "es" ? "Título de la obra..." : "Score title...",
    save: language === "es" ? "💾 Guardar" : "💾 Save",
    connect: language === "es" ? "🔌 Conectarse" : "🔌 Connect",
    usb: "🔌 USB",
    bluetooth: "🛜 Bluetooth",
    signOut: language === "es" ? "🚪 Salir" : "🚪 Sign out",
    signIn: language === "es" ? "👤 Iniciar Sesión" : "👤 Sign in",
  };

  return (
    <div className="flex flex-col w-full gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setLanguage((prev) => (prev === "es" ? "en" : "es"))}
          className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          {language === "es" ? "EN" : "ES"}
        </button>
        <button
          onClick={toggleHeaderVisibility}
          className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          {isHeaderVisible ? t.hideHeader : t.showHeader}
        </button>
      </div>

      {isHeaderVisible && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <select
            className="px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-blue-50 w-full sm:w-auto cursor-pointer outline-none"
            onChange={(e) => handleLoadScore(e.target.value)}
            defaultValue=""
            disabled={!session}
          >
            <option value="" disabled>
              {session ? t.openSaved : t.openGuest}
            </option>
            {savedScores.map((score) => (
              <option key={score.id} value={score.id}>
                {score.title || "Sin título"} -{" "}
                {new Date(score.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>

          <label className="flex-1 sm:flex-none px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap">
            {t.importXml}
            <input
              type="file"
              accept=".musicxml,.xml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <input
            type="text"
            placeholder={t.titlePlaceholder}
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
              {isSaving ? "⏳..." : t.save}
            </button>

            <select
              value={connectionType === "none" ? "" : connectionType}
              onChange={(e) => {
                if (e.target.value === "usb") {
                  handleConnectUSB();
                } else if (e.target.value === "ble") {
                  handleConnectBLE();
                }
              }}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap border outline-none ${connectionType === "usb" ? "bg-green-100 text-green-700 border-green-500" : connectionType === "ble" ? "bg-blue-100 text-blue-700 border-blue-500" : "bg-gray-800 text-white border-gray-700"}`}
            >
              <option value="" className="text-gray-700 bg-white">
                {t.connect}
              </option>
              <option value="usb" className="text-gray-700 bg-white">
                {t.usb}
              </option>
              <option value="ble" className="text-gray-700 bg-white">
                {t.bluetooth}
              </option>
            </select>

            {session ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap bg-red-100 text-red-700 hover:bg-red-200 border-2 border-transparent"
              >
                {t.signOut}
              </button>
            ) : (
              <button
                onClick={() => setIsGuest(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-2 border-transparent"
              >
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
