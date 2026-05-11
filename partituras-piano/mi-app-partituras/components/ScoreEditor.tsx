// src/components/ScoreEditor.tsx
"use client";
import { useState, useEffect } from "react";
import { NoteData, getBeats } from "../utils/musicLogic";
import VexFlowRenderer from "./VexFlowRender";
import { supabase } from "../utils/superbaseClient";
import { Sidebar } from "./Sidebar";
import { ControlPanel } from "./ControlPanel";

export default function ScoreEditor() {
  // --- ESTADOS ---
  const [notesList, setNotesList] = useState<NoteData[]>([]);
  const [currentDuration, setCurrentDuration] = useState<string>("q");
  const [timeSignature, setTimeSignature] = useState<string>("4/4");
  const [activeClef, setActiveClef] = useState<"treble" | "bass">("treble");
  const [isDotActive, setIsDotActive] = useState<boolean>(false);
  const [isTieActive, setIsTieActive] = useState<boolean>(false);
  const [isChordMode, setIsChordMode] = useState<boolean>(false);
  const [articulation, setArticulation] = useState<string>("none");
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(
    null,
  );
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);
  const [rowOctaves, setRowOctaves] = useState<number[]>([5, 4, 3]);
  const [accidental, setAccidental] = useState<"none" | "#" | "b">("none");
  const [title, setTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedScores, setSavedScores] = useState<any[]>([]);
  const [keySignature, setKeySignature] = useState<string>("C");
  const [activeVoice, setActiveVoice] = useState<number>(1);

  // --- LÓGICA DE DATOS ---
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

  const saveScore = async () => {
    if (!title) return alert("⚠️ Ponle un título.");
    setIsSaving(true);

    const { error } = await supabase.from("scores").insert([
      {
        title: title,
        content: notesList,
        time_signature: timeSignature,
        key_signature: keySignature,
      },
    ]);

    if (!error) {
      alert("✅ ¡Guardado con éxito!");
      fetchScores();
    } else {
      console.error("Error guardando:", error);
      alert("❌ Hubo un error al guardar.");
    }
    setIsSaving(false);
  };

  // --- FUNCIONES DE EDICIÓN ---
  const updateSelectedNoteProperty = (
    updater: (note: NoteData) => NoteData,
  ) => {
    if (selectedNoteIndex === null) return;
    const updatedList = [...notesList];
    updatedList[selectedNoteIndex] = updater(updatedList[selectedNoteIndex]);
    setNotesList(updatedList);
  };

  const changeRowOctave = (rowIndex: number, delta: number) => {
    const newOct = Math.max(1, Math.min(7, rowOctaves[rowIndex] + delta));
    const newOctaves = [...rowOctaves];
    newOctaves[rowIndex] = newOct;
    setRowOctaves(newOctaves);
  };

  const toggleAccidental = (targetAcc: "#" | "b") => {
    const newAcc = accidental === targetAcc ? "none" : targetAcc;
    setAccidental(newAcc);
  };

  const handleArticulationChange = (newArt: string) => {
    setArticulation(newArt);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        articulation: newArt === "none" ? undefined : newArt,
      }));
    }
  };

  // 🔥 FUNCIÓN MÁGICA: Sincroniza la voz actual con el progreso de la partitura
  const syncVoicePointer = (
    targetVoice: number,
    targetBeatPosition?: number,
  ) => {
    const currentVoiceNotes = notesList.filter(
      (n) => (n.voice || 1) === targetVoice && n.clef === activeClef,
    );

    let currentVoiceBeats = 0;
    currentVoiceNotes.forEach((n) => {
      currentVoiceBeats += getBeats(n.duration, n.isDotted);
    });

    let goalBeats = targetBeatPosition || 0;

    if (!targetBeatPosition) {
      const otherVoiceNotes = notesList.filter(
        (n) => (n.voice || 1) !== targetVoice && n.clef === activeClef,
      );
      otherVoiceNotes.forEach((n) => {
        goalBeats += getBeats(n.duration, n.isDotted);
      });
    }

    if (currentVoiceBeats < goalBeats) {
      let remaining = goalBeats - currentVoiceBeats;
      const newRests: NoteData[] = [];
      const restKey = activeClef === "treble" ? "b/4" : "d/3";

      while (remaining >= 1) {
        newRests.push({
          keys: [restKey],
          duration: "qr",
          clef: activeClef,
          voice: targetVoice,
          isInvisible: true,
        });
        remaining -= 1;
      }
      if (remaining >= 0.5) {
        newRests.push({
          keys: [restKey],
          duration: "8r",
          clef: activeClef,
          voice: targetVoice,
          isInvisible: true,
        });
      }

      if (newRests.length > 0) {
        setNotesList((prev) => [...prev, ...newRests]);
      }
    }
  };

  // 🔥 NUEVA FUNCIÓN: Maneja el cambio de voz e invoca la sincronización
  const handleVoiceChange = (newVoice: number) => {
    let targetBeat = 0;

    // Si hay una nota seleccionada, calculamos su posición exacta en tiempos
    if (selectedNoteIndex !== null) {
      const selectedNote = notesList[selectedNoteIndex];
      const sameClefNotes = notesList.filter(
        (n) =>
          n.clef === selectedNote.clef &&
          (n.voice || 1) === (selectedNote.voice || 1),
      );

      for (let n of sameClefNotes) {
        if (n === selectedNote) break;
        targetBeat += getBeats(n.duration, n.isDotted);
      }

      // Importante: Al cambiar de voz, deseleccionamos la nota para no editar la Voz 1 por error
      setSelectedNoteIndex(null);
      setSelectedKeyIndex(null);
    }

    setActiveVoice(newVoice);
    syncVoicePointer(newVoice, targetBeat);
  };

  const addSpecificNote = (noteKey: string, rowIndex: number) => {
    const octaveToUse = rowOctaves[rowIndex];
    const keyToUse =
      accidental === "none"
        ? `${noteKey}/${octaveToUse}`
        : `${noteKey}${accidental}/${octaveToUse}`;

    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => {
        const newDuration = note.duration.replace("r", "");

        if (isChordMode && !note.duration.includes("r")) {
          if (note.keys.includes(keyToUse)) return note;
          return {
            ...note,
            keys: [...note.keys, keyToUse].sort(),
            duration: newDuration,
          };
        }

        if (
          !isChordMode &&
          selectedKeyIndex !== null &&
          selectedKeyIndex !== -1
        ) {
          const newKeys = [...note.keys];
          newKeys[selectedKeyIndex] = keyToUse;
          return { ...note, keys: newKeys.sort(), duration: newDuration };
        }

        return {
          ...note,
          keys: [keyToUse],
          clef: activeClef,
          duration: newDuration,
        };
      });
      return;
    }

    const lastNote = notesList[notesList.length - 1];

    if (
      isChordMode &&
      lastNote &&
      lastNote.duration === currentDuration &&
      lastNote.clef === activeClef &&
      (lastNote.voice || 1) === activeVoice &&
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
        articulation: articulation === "none" ? undefined : articulation,
        voice: activeVoice,
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

  const undoLastNote = () => {
    if (selectedNoteIndex !== null) {
      const noteToEdit = notesList[selectedNoteIndex];
      const newList = [...notesList];

      if (
        selectedKeyIndex !== null &&
        selectedKeyIndex !== -1 &&
        noteToEdit.keys.length > 1
      ) {
        const newKeys = [...noteToEdit.keys];
        newKeys.splice(selectedKeyIndex, 1);
        newList[selectedNoteIndex] = { ...noteToEdit, keys: newKeys };
      } else {
        const restKey = noteToEdit.clef === "treble" ? "b/4" : "d/3";
        const newRest: NoteData = {
          keys: [restKey],
          duration: noteToEdit.duration.replace("r", "") + "r",
          clef: noteToEdit.clef,
          isDotted: noteToEdit.isDotted,
          manualTie: false,
          voice: noteToEdit.voice || 1,
        };

        newList[selectedNoteIndex] = newRest;

        if (selectedNoteIndex > 0) {
          const prevIndex = selectedNoteIndex - 1;
          if (newList[prevIndex]) {
            newList[prevIndex] = { ...newList[prevIndex], manualTie: false };
          }
        }
        setSelectedKeyIndex(null);
      }

      setNotesList(newList);
      return;
    }

    if (notesList.length === 0) return;

    const newList = [...notesList];

    let lastVoiceIndex = -1;
    for (let i = newList.length - 1; i >= 0; i--) {
      if ((newList[i].voice || 1) === activeVoice) {
        lastVoiceIndex = i;
        break;
      }
    }

    if (lastVoiceIndex === -1) return;

    const lastNote = newList[lastVoiceIndex];

    if (lastNote.keys.length > 1 && !lastNote.duration.includes("r")) {
      const newKeys = lastNote.keys.slice(0, -1);
      newList[lastVoiceIndex] = { ...lastNote, keys: newKeys };
      setNotesList(newList);
    } else {
      newList.splice(lastVoiceIndex, 1);
      setNotesList(newList);
    }
  };

  const addRest = () => {
    const defaultOctave = rowOctaves[1];
    const restKey =
      activeClef === "treble" ? `b/${defaultOctave}` : `d/${defaultOctave - 1}`;

    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: [restKey],
        duration: note.duration.replace("r", "") + "r",
      }));
      setSelectedKeyIndex(null);
      return;
    }

    setNotesList([
      ...notesList,
      {
        keys: [restKey],
        duration: currentDuration + "r",
        clef: activeClef,
        isDotted: isDotActive,
        manualTie: false,
        voice: activeVoice,
      },
    ]);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 md:p-6 bg-gray-50 min-h-screen items-start">
      <Sidebar
        savedScores={savedScores}
        onLoadScore={(s) => {
          setNotesList(s.content);
          setTitle(s.title);
          setTimeSignature(s.time_signature || "4/4");
          setKeySignature(s.key_signature || "C");
          setSelectedNoteIndex(null);
        }}
      />

      <div className="flex-1 flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <input
            type="text"
            placeholder="Título de la obra..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-4 py-2 w-full sm:flex-1 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-800 text-lg"
          />
          <button
            onClick={saveScore}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:bg-blue-300 flex items-center justify-center gap-2"
          >
            {isSaving ? "⏳ Guardando..." : "💾 Guardar"}
          </button>
        </div>

        <ControlPanel
          {...{
            activeClef,
            setActiveClef,
            activeVoice,
            setActiveVoice: handleVoiceChange, // 🔥 Usamos handleVoiceChange en lugar de setActiveVoice
            rowOctaves,
            changeRowOctave,
            currentDuration,
            setDurationAndEdit: (d) => setCurrentDuration(d),
            isDotActive,
            toggleDot: () => setIsDotActive(!isDotActive),
            isTieActive,
            toggleTie: () => setIsTieActive(!isTieActive),
            accidental,
            toggleAccidental,
            isChordMode,
            setIsChordMode,
            addSpecificNote,
            addRest,
            undoLastNote,
            articulation,
            setArticulation: handleArticulationChange,
            clearAll: () => {
              setNotesList([]);
              setSelectedNoteIndex(null);
            },
            selectedNoteIndex,
            timeSignature,
            setTimeSignature,
            keySignature,
            setKeySignature,
          }}
        />

        <div className="bg-white p-4 md:p-10 rounded-3xl shadow-xl border border-gray-200 overflow-x-auto">
          <VexFlowRenderer
            notesList={notesList}
            timeSignature={timeSignature}
            keySignature={keySignature}
            selectedNoteIndex={selectedNoteIndex}
            selectedKeyIndex={selectedKeyIndex}
            onNoteClick={(noteIdx, keyIdx) => {
              setSelectedNoteIndex(noteIdx === -1 ? null : noteIdx);
              setSelectedKeyIndex(keyIdx === -1 ? null : keyIdx);
            }}
          />
        </div>
      </div>
    </div>
  );
}
