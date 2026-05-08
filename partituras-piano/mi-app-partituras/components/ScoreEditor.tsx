// --- src/components/ScoreEditor.tsx ---
"use client";
import { useState, useEffect } from "react";
import { NoteData } from "../utils/musicLogic";
import VexFlowRenderer from "./VexFlowRender";
import { supabase } from "../utils/superbaseClient";

export default function ScoreEditor() {
  const [notesList, setNotesList] = useState<NoteData[]>([]);
  const [currentDuration, setCurrentDuration] = useState<string>("q");
  const [timeSignature, setTimeSignature] = useState<string>("4/4");
  const [activeClef, setActiveClef] = useState<"treble" | "bass">("treble");
  const [isDotActive, setIsDotActive] = useState<boolean>(false);
  const [isTieActive, setIsTieActive] = useState<boolean>(false);
  const [isChordMode, setIsChordMode] = useState<boolean>(false);

  // Estado de la nota seleccionada
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(
    null,
  );

  // Estado de la octava
  const [currentOctave, setCurrentOctave] = useState<number>(4);
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

  // --- FUNCIONES AUXILIARES PARA EDICIÓN ---
  const updateSelectedNoteProperty = (
    updater: (note: NoteData) => NoteData,
  ) => {
    if (selectedNoteIndex === null) return;
    const updatedList = [...notesList];
    updatedList[selectedNoteIndex] = updater(updatedList[selectedNoteIndex]);
    setNotesList(updatedList);
  };

  const changeOctave = (delta: number) => {
    const newOct = Math.max(1, Math.min(7, currentOctave + delta));
    setCurrentOctave(newOct);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: note.keys.map((k) => `${k.split("/")[0]}/${newOct}`),
      }));
    }
  };

  const toggleAccidental = (targetAcc: "#" | "b") => {
    const newAcc = accidental === targetAcc ? "none" : targetAcc;
    setAccidental(newAcc);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: note.keys.map((k) => {
          const [notePitch, oct] = k.split("/");
          const pureKey = notePitch.replace("#", "").replace("b", "");
          return newAcc === "none"
            ? `${pureKey}/${oct}`
            : `${pureKey}${newAcc}/${oct}`;
        }),
      }));
    }
  };

  const setDurationAndEdit = (dur: string) => {
    setCurrentDuration(dur);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        duration: note.duration.includes("r") ? `${dur}r` : dur,
      }));
    }
  };

  const toggleDot = () => {
    const newVal = !isDotActive;
    setIsDotActive(newVal);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({ ...note, isDotted: newVal }));
    }
  };

  const toggleTie = () => {
    const newVal = !isTieActive;
    setIsTieActive(newVal);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({ ...note, manualTie: newVal }));
    }
  };

  // --- LÓGICA PRINCIPAL DE NOTAS ---
  const addSpecificNote = (noteKey: string, nextOctave?: boolean) => {
    const octaveToUse = nextOctave ? currentOctave + 1 : currentOctave;
    const keyToUse =
      accidental === "none"
        ? `${noteKey}/${octaveToUse}`
        : `${noteKey}${accidental}/${octaveToUse}`;

    // Si hay una nota seleccionada, la editamos en lugar de añadir

    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => {
        if (isChordMode && !note.duration.includes("r")) {
          if (note.keys.includes(keyToUse)) return note;
          return { ...note, keys: [...note.keys, keyToUse].sort() };
        }
        // 🔥 Reemplaza la nota y ASEGURA que le quitamos la "r" de silencio
        return {
          ...note,
          keys: [keyToUse],
          clef: activeClef,
          duration: note.duration.replace("r", ""), // <--- EL TRUCO ESTÁ AQUÍ
        };
      });
      return;
    }
    // Comportamiento normal (añadir nota nueva o acorde al final)
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
    const restKey =
      activeClef === "treble" ? `b/${currentOctave}` : `d/${currentOctave - 1}`;

    // Si hay nota seleccionada, la convertimos en silencio
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: [restKey],
        duration: note.duration.replace("r", "") + "r",
      }));
      return;
    }

    setNotesList([
      ...notesList,
      {
        keys: [restKey],
        duration: currentDuration + "r",
        clef: activeClef,
      },
    ]);
  };

  const undoLastNote = () => {
    // CASO 1: Hay una nota seleccionada -> La convertimos en silencio
    if (selectedNoteIndex !== null) {
      const noteToDelete = notesList[selectedNoteIndex];

      // En VexFlow, los silencios por defecto se colocan en b/4 (Sol) o d/3 (Fa)
      const restKey = noteToDelete.clef === "treble" ? "b/4" : "d/3";

      // Creamos el silencio heredando la duración, el puntillo y la clave
      const newRest: NoteData = {
        keys: [restKey],
        duration: noteToDelete.duration.replace("r", "") + "r", // Asegura que acabe en "r"
        clef: noteToDelete.clef,
        isDotted: noteToDelete.isDotted, // Mantenemos el puntillo si lo tenía
        manualTie: false, // Un silencio no puede estar ligado
      };

      const newList = [...notesList];
      newList[selectedNoteIndex] = newRest; // Reemplazamos la nota por el silencio

      // Si la nota anterior estaba ligada a la que acabamos de borrar, rompemos esa ligadura
      if (selectedNoteIndex > 0 && newList.length > 0) {
        const prevIndex = selectedNoteIndex - 1;
        if (newList[prevIndex]) {
          newList[prevIndex] = { ...newList[prevIndex], manualTie: false };
        }
      }

      setNotesList(newList);
      setSelectedNoteIndex(null); // Quitamos la selección al terminar
      return;
    }

    // CASO 2: Comportamiento normal del botón "Deshacer" (sin seleccionar nada)
    // Elimina la última nota del arreglo por completo para acortar la partitura
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
    { name: "Do", key: "c" },
    { name: "Re", key: "d" },
    { name: "Mi", key: "e" },
    { name: "Fa", key: "f" },
    { name: "Sol", key: "g" },
    { name: "La", key: "a" },
    { name: "Si", key: "b" },
    { name: "Do+", key: "c", nextOctave: true },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 md:p-6 bg-gray-50 min-h-screen items-start">
      {/* SIDEBAR: Mis Obras (Sticky) */}
      <div className="w-full lg:w-64 bg-white p-4 rounded-2xl shadow-lg border h-fit text-gray-800 sticky top-4 z-40 hidden md:block">
        <h3 className="font-extrabold text-lg mb-4 border-b border-gray-200 pb-2 text-gray-900 flex items-center gap-2">
          📁 Mis Obras
        </h3>
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {savedScores.length === 0 && (
            <p className="text-gray-400 text-sm">No hay obras.</p>
          )}
          {savedScores.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setNotesList(s.content);
                setTitle(s.title);
                setSelectedNoteIndex(null);
                fetchScores();
              }}
              className="text-left p-3 rounded-lg hover:bg-blue-50 border border-gray-100 transition-all text-gray-800"
            >
              <div className="font-bold truncate text-gray-900 text-sm">
                {s.title}
              </div>
              <div className="text-[10px] text-gray-400">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col gap-4 w-full">
        {/* PANEL DE CONTROLES (FORZADO STICKY) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-4 text-gray-900 sticky top-4 z-50">
          {/* Título y Guardar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-100">
            <input
              type="text"
              placeholder="Título de la obra..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-2 w-full sm:flex-1 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 font-semibold text-gray-800"
            />
            <button
              onClick={saveScore}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:bg-blue-300 flex items-center justify-center gap-2"
            >
              {isSaving ? "⏳" : "💾 Guardar"}
            </button>
          </div>

          {/* Segunda fila: Claves y Octava */}
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveClef("treble")}
                  className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${activeClef === "treble" ? "bg-white text-blue-600 shadow" : "text-gray-500"}`}
                >
                  𝄞 Sol
                </button>
                <button
                  onClick={() => setActiveClef("bass")}
                  className={`px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${activeClef === "bass" ? "bg-white text-purple-600 shadow" : "text-gray-500"}`}
                >
                  𝄢 Fa
                </button>
              </div>

              <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-xl border border-orange-100">
                <span className="text-[10px] font-bold text-orange-700 uppercase">
                  Octava
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeOctave(-1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-orange-200 rounded-lg text-orange-700 font-bold"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-black text-orange-800">
                    {currentOctave}
                  </span>
                  <button
                    onClick={() => changeOctave(1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-orange-200 rounded-lg text-orange-700 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Modificadores */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {["w", "h", "q", "8"].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setDurationAndEdit(dur)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${currentDuration === dur ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"}`}
                >
                  {dur.toUpperCase()}
                </button>
              ))}
              <button
                onClick={toggleDot}
                className={`px-2.5 py-1 rounded-md border-2 text-xs ${isDotActive ? "border-blue-500 bg-blue-100 text-blue-700" : "bg-gray-200"}`}
              >
                •
              </button>
              <button
                onClick={toggleTie}
                className={`px-2.5 py-1 rounded-md border-2 text-xs ${isTieActive ? "border-green-500 bg-green-100 text-green-700" : "bg-gray-200"}`}
              >
                ‿
              </button>
              <button
                onClick={() => toggleAccidental("#")}
                className={`px-2.5 py-1 rounded-md border-2 text-xs font-bold ${accidental === "#" ? "border-purple-500 bg-purple-100 text-purple-700" : "bg-gray-200"}`}
              >
                ♯
              </button>
              <button
                onClick={() => toggleAccidental("b")}
                className={`px-2.5 py-1 rounded-md border-2 text-xs font-bold ${accidental === "b" ? "border-purple-500 bg-purple-100 text-purple-700" : "bg-gray-200"}`}
              >
                ♭
              </button>
              <button
                onClick={() => setIsChordMode(!isChordMode)}
                className={`px-3 py-1 rounded-md font-bold border-2 text-xs ${isChordMode ? "border-orange-500 bg-orange-100 text-orange-700" : "bg-gray-200"}`}
              >
                🎹 Acorde
              </button>
            </div>
          </div>

          {/* Notas */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
            {notesUI.map((n) => (
              <button
                key={n.name}
                onClick={() => addSpecificNote(n.key, n.nextOctave)}
                className={`py-3 border-2 rounded-xl font-bold text-gray-800 transition-all active:scale-95 text-sm md:text-base ${activeClef === "treble" ? "border-blue-100 hover:border-blue-500" : "border-purple-100 hover:border-purple-500"}`}
              >
                {n.name}
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={addRest}
              className="py-2 bg-gray-800 text-white rounded-xl font-bold text-xs md:text-sm"
            >
              𝄽 Silencio
            </button>
            <button
              onClick={undoLastNote}
              className={`py-2 text-white rounded-xl font-bold text-xs md:text-sm transition-colors ${selectedNoteIndex !== null ? "bg-red-600 hover:bg-red-700" : "bg-yellow-500 hover:bg-yellow-600"}`}
            >
              {selectedNoteIndex !== null ? "🗑️ Borrar Nota" : "↩️ Deshacer"}
            </button>
            <button
              onClick={() => {
                setNotesList([]);
                setSelectedNoteIndex(null);
              }}
              className="py-2 bg-red-500 text-white rounded-xl font-bold text-xs md:text-sm"
            >
              🗑️ Limpiar Todo
            </button>
          </div>
        </div>

        {/* LIENZO */}
        <div className="bg-white p-4 md:p-10 rounded-3xl shadow-xl border border-gray-200 overflow-x-auto">
          <div className="min-w-[800px] lg:min-w-full flex justify-center">
            {/* AQUI SE CONECTAN LAS PROPS DE SELECCION */}
            <VexFlowRenderer
              notesList={notesList}
              timeSignature={timeSignature}
              selectedNoteIndex={selectedNoteIndex}
              onNoteClick={(index) => {
                setSelectedNoteIndex(index === -1 ? null : index);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
