// --- src/components/ScoreEditor.tsx ---
"use client";
import { useState, useEffect } from "react";
import { NoteData } from "../utils/musicLogic";
import VexFlowRenderer from "./VexFlowRender";
import { supabase } from "../utils/superbaseClient"; // Asegúrate de que este nombre sea correcto, suele ser supabaseClient

export default function ScoreEditor() {
  const [notesList, setNotesList] = useState<NoteData[]>([]);
  const [currentDuration, setCurrentDuration] = useState<string>("q");
  const [timeSignature, setTimeSignature] = useState<string>("4/4");
  const [activeClef, setActiveClef] = useState<"treble" | "bass">("treble");
  const [isDotActive, setIsDotActive] = useState<boolean>(false);
  const [isTieActive, setIsTieActive] = useState<boolean>(false);
  const [isChordMode, setIsChordMode] = useState<boolean>(false);

  // Estado para las alteraciones (sostenidos y bemoles)
  const [accidental, setAccidental] = useState<"none" | "#" | "b">("none");

  const [title, setTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedScores, setSavedScores] = useState<any[]>([]);

  const fetchScores = async () => {
    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSavedScores(data || []);
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const addSpecificNote = (noteTreble: string, noteBass: string) => {
    // 1. CORREGIDO: Declaramos rawKey primero
    const rawKey = activeClef === "treble" ? noteTreble : noteBass;

    // 2. CORREGIDO: Declaramos keyToUse inyectando la alteración si la hay
    const keyToUse =
      accidental === "none" ? rawKey : rawKey.replace("/", accidental + "/");

    const lastNote = notesList[notesList.length - 1];

    if (
      isChordMode &&
      lastNote &&
      lastNote.duration === currentDuration &&
      lastNote.clef === activeClef &&
      !lastNote.duration.includes("r")
    ) {
      if (lastNote.keys.includes(keyToUse)) return;

      const updatedList = [...notesList];
      const lastIndex = updatedList.length - 1;
      updatedList[lastIndex] = {
        ...updatedList[lastIndex],
        keys: [...updatedList[lastIndex].keys, keyToUse].sort(),
      };
      setNotesList(updatedList);
    } else {
      const newNote: NoteData = {
        keys: [keyToUse],
        duration: currentDuration,
        clef: activeClef,
        isDotted: isDotActive,
        manualTie: false,
      };

      if (isTieActive && notesList.length > 0) {
        const updatedList = [...notesList];
        updatedList[updatedList.length - 1] = {
          ...updatedList[updatedList.length - 1],
          manualTie: true,
        };
        setNotesList([...updatedList, newNote]);
      } else {
        setNotesList([...notesList, newNote]);
      }
    }
  };

  const addRest = () => {
    setNotesList([
      ...notesList,
      {
        keys: [activeClef === "treble" ? "b/4" : "d/3"],
        duration: currentDuration + "r",
        clef: activeClef,
      },
    ]);
  };

  const undoLastNote = () => {
    if (notesList.length === 0) return;
    const newList = notesList.slice(0, -1);
    if (newList.length > 0) {
      newList[newList.length - 1] = {
        ...newList[newList.length - 1],
        manualTie: false,
      };
    }
    setNotesList(newList);
  };

  const saveScore = async () => {
    if (!title) {
      alert("⚠️ Ponle un título a tu obra antes de guardar.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("scores")
      .insert([{ title: title, content: notesList }]);
    if (!error) {
      alert("✅ ¡Guardado!");
      fetchScores();
    } else {
      alert("❌ Error: " + error.message);
    }
    setIsSaving(false);
  };

  const notesUI = [
    { name: "Do", t: "c/4", b: "c/3" },
    { name: "Re", t: "d/4", b: "d/3" },
    { name: "Mi", t: "e/4", b: "e/3" },
    { name: "Fa", t: "f/4", b: "f/3" },
    { name: "Sol", t: "g/4", b: "g/3" },
    { name: "La", t: "a/4", b: "a/3" },
    { name: "Si", t: "b/4", b: "b/3" },
    { name: "Do+", t: "c/5", b: "c/4" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-8 bg-gray-50 min-h-screen">
      <div className="w-full lg:w-64 bg-white p-6 rounded-2xl shadow-lg border h-fit text-gray-800">
        <h3 className="font-extrabold text-lg mb-4 border-b border-gray-200 pb-2 text-gray-900 flex items-center gap-2">
          📁 Mis Obras
        </h3>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {savedScores.length === 0 && (
            <p className="text-gray-400 text-sm">No hay obras aún.</p>
          )}
          {savedScores.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setNotesList(s.content);
                setTitle(s.title);
                alert(`Cargada: ${s.title}`);
                fetchScores();
              }}
              className="text-left p-3 rounded-lg hover:bg-blue-50 border border-gray-100 transition-all text-gray-800"
            >
              <div className="font-bold truncate text-gray-900">{s.title}</div>
              <div className="text-[10px] text-gray-500">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-5">
        <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-5 text-gray-900">
          <div className="flex justify-between items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <input
              type="text"
              placeholder="Escribe el título aquí..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-2 w-1/2 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 font-semibold text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={saveScore}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:bg-blue-300"
            >
              {isSaving ? "⏳" : "💾 Guardar"}
            </button>
          </div>

          <div className="flex flex-wrap justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveClef("treble")}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeClef === "treble" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}
              >
                𝄞 Sol
              </button>
              <button
                onClick={() => setActiveClef("bass")}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeClef === "bass" ? "bg-white text-purple-600 shadow" : "text-gray-500"}`}
              >
                𝄢 Fa
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["w", "h", "q", "8"].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setCurrentDuration(dur)}
                  className={`px-3 py-1 rounded-md text-sm font-bold ${currentDuration === dur ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                >
                  {dur.toUpperCase()}
                </button>
              ))}

              <button
                onClick={() => setIsDotActive(!isDotActive)}
                className={`ml-2 px-3 py-1 rounded-md border-2 transition-all ${
                  isDotActive
                    ? "border-blue-500 bg-blue-100 text-blue-700"
                    : "border-gray-300 bg-gray-100 text-gray-700"
                }`}
                title="Puntillo"
              >
                •
              </button>

              <button
                onClick={() => setIsTieActive(!isTieActive)}
                className={`ml-1 px-3 py-1 rounded-md border-2 transition-all ${
                  isTieActive
                    ? "border-green-500 bg-green-100 text-green-700"
                    : "border-gray-300 bg-gray-100 text-gray-700"
                }`}
                title="Ligar con la anterior"
              >
                ‿
              </button>

              {/* NUEVO: Botones de alteraciones insertados aquí */}
              <button
                onClick={() => setAccidental(accidental === "#" ? "none" : "#")}
                className={`ml-2 px-3 py-1 rounded-md border-2 transition-all font-bold ${
                  accidental === "#"
                    ? "border-purple-500 bg-purple-100 text-purple-700"
                    : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Sostenido"
              >
                ♯
              </button>

              <button
                onClick={() => setAccidental(accidental === "b" ? "none" : "b")}
                className={`ml-1 px-3 py-1 rounded-md border-2 transition-all font-bold ${
                  accidental === "b"
                    ? "border-purple-500 bg-purple-100 text-purple-700"
                    : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Bemol"
              >
                ♭
              </button>

              <button
                onClick={() => setIsChordMode(!isChordMode)}
                className={`ml-2 px-4 py-1 rounded-md font-bold border-2 transition-all ${isChordMode ? "border-orange-500 bg-orange-100 text-orange-700" : "border-gray-300 bg-gray-100 text-gray-600"}`}
              >
                🎹 Acorde
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {notesUI.map((n) => (
              <button
                key={n.name}
                onClick={() => addSpecificNote(n.t, n.b)}
                className={`py-4 border-2 rounded-xl font-bold text-lg text-gray-800 transition-all shadow-sm active:scale-95 ${
                  activeClef === "treble"
                    ? "border-blue-200 hover:border-blue-500 hover:text-blue-700"
                    : "border-purple-200 hover:border-purple-500 hover:text-purple-700"
                }`}
              >
                <span>{n.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <button
              onClick={addRest}
              className="py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-all"
            >
              𝄽 Silencio
            </button>
            <button
              onClick={undoLastNote}
              disabled={notesList.length === 0}
              className="py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 disabled:opacity-50"
            >
              ↩️ Deshacer
            </button>
            <button
              onClick={() => setNotesList([])}
              className="py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600"
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>

        <div className="w-full bg-white p-10 rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <VexFlowRenderer
              notesList={notesList}
              timeSignature={timeSignature}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
