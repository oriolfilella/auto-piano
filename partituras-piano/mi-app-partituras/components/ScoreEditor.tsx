// src/components/ScoreEditor.tsx
"use client";
import { useState, useEffect } from "react";
import { NoteData } from "../utils/musicLogic";
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

  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(
    null,
  );
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [accidental, setAccidental] = useState<"none" | "#" | "b">("none");
  const [title, setTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedScores, setSavedScores] = useState<any[]>([]);
  const [keySignature, setKeySignature] = useState<string>("C"); // "C" es Do Mayor (sin alteraciones)

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
    const { error } = await supabase
      .from("scores")
      .insert([{ title, content: notesList }]);
    if (!error) {
      alert("✅ Guardado!");
      fetchScores();
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

  const changeOctave = (delta: number) => {
    const newOct = Math.max(1, Math.min(7, currentOctave + delta));
    setCurrentOctave(newOct);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: note.keys.map((k, index) => {
          if (
            selectedKeyIndex !== null &&
            selectedKeyIndex !== -1 &&
            index !== selectedKeyIndex
          ) {
            return k;
          }
          return `${k.split("/")[0]}/${newOct}`;
        }),
      }));
    }
  };

  const toggleAccidental = (targetAcc: "#" | "b") => {
    const newAcc = accidental === targetAcc ? "none" : targetAcc;
    setAccidental(newAcc);
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: note.keys.map((k, index) => {
          if (
            selectedKeyIndex !== null &&
            selectedKeyIndex !== -1 &&
            index !== selectedKeyIndex
          ) {
            return k;
          }
          const [notePitch, oct] = k.split("/");
          const pureKey = notePitch.charAt(0);
          return newAcc === "none"
            ? `${pureKey}/${oct}`
            : `${pureKey}${newAcc}/${oct}`;
        }),
      }));
    }
  };

  const addSpecificNote = (noteKey: string, nextOctave?: boolean) => {
    const octaveToUse = nextOctave ? currentOctave + 1 : currentOctave;
    const keyToUse =
      accidental === "none"
        ? `${noteKey}/${octaveToUse}`
        : `${noteKey}${accidental}/${octaveToUse}`;

    // CASO 1: Hay una nota o acorde seleccionado en el lienzo
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

    // CASO 2: NO hay nada seleccionado (Añadir al final)
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

  const undoLastNote = () => {
    // CASO 1: Hay una nota o parte de un acorde seleccionado
    if (selectedNoteIndex !== null) {
      const noteToEdit = notesList[selectedNoteIndex];
      const newList = [...notesList];

      // ¿Está seleccionada una nota individual dentro de un acorde de varias notas?
      if (
        selectedKeyIndex !== null &&
        selectedKeyIndex !== -1 &&
        noteToEdit.keys.length > 1
      ) {
        // Eliminamos solo esa nota del acorde, dejando el resto intacto
        const newKeys = [...noteToEdit.keys];
        newKeys.splice(selectedKeyIndex, 1);
        newList[selectedNoteIndex] = { ...noteToEdit, keys: newKeys };
      } else {
        // Se seleccionó toda la nota/acorde, o solo quedaba una nota.
        // -> La convertimos en un silencio equivalente
        const restKey = noteToEdit.clef === "treble" ? "b/4" : "d/3";
        const newRest: NoteData = {
          keys: [restKey],
          duration: noteToEdit.duration.replace("r", "") + "r", // Asegura que sea silencio
          clef: noteToEdit.clef,
          isDotted: noteToEdit.isDotted,
          manualTie: false,
        };

        newList[selectedNoteIndex] = newRest;

        // Si la nota anterior estaba ligada a esta, rompemos la ligadura
        if (selectedNoteIndex > 0) {
          const prevIndex = selectedNoteIndex - 1;
          if (newList[prevIndex]) {
            newList[prevIndex] = { ...newList[prevIndex], manualTie: false };
          }
        }

        // Al convertir a silencio, quitamos la selección de la "cabeza" de nota
        setSelectedKeyIndex(null);
      }

      setNotesList(newList);
      return;
    }

    // CASO 2: Comportamiento normal de "Deshacer" (sin seleccionar nada en el lienzo)
    if (notesList.length === 0) return;

    const newList = [...notesList];
    const lastIndex = newList.length - 1;
    const lastNote = newList[lastIndex];

    // ✨ NUEVO: Verificamos si la última nota es un acorde (tiene más de 1 tecla) y no es un silencio
    if (lastNote.keys.length > 1 && !lastNote.duration.includes("r")) {
      // Si es un acorde, simplemente eliminamos la última tecla de su lista
      // (Como las notas se ordenan al crearse, esto quitará la nota más alta del acorde)
      const newKeys = lastNote.keys.slice(0, -1);
      newList[lastIndex] = { ...lastNote, keys: newKeys };
      setNotesList(newList);
    } else {
      // Si no es un acorde (es una sola nota o un silencio), borramos la nota entera
      const shortenedList = newList.slice(0, -1);
      if (shortenedList.length > 0) {
        shortenedList[shortenedList.length - 1] = {
          ...shortenedList[shortenedList.length - 1],
          manualTie: false,
        };
      }
      setNotesList(shortenedList);
    }
  };

  const addRest = () => {
    const restKey =
      activeClef === "treble" ? `b/${currentOctave}` : `d/${currentOctave - 1}`;

    // Si hay una nota seleccionada, la reemplazamos por el silencio
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        keys: [restKey],
        duration: note.duration.replace("r", "") + "r",
      }));
      setSelectedKeyIndex(null);
      return;
    }

    // Añadir silencio al final
    setNotesList([
      ...notesList,
      {
        keys: [restKey],
        duration: currentDuration + "r",
        clef: activeClef,
        isDotted: isDotActive,
        manualTie: false,
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
          setSelectedNoteIndex(null);
        }}
      />

      <div className="flex-1 flex flex-col gap-4 w-full">
        <ControlPanel
          {...{
            title,
            setTitle,
            timeSignature,
            setTimeSignature,
            saveScore,
            isSaving,
            activeClef,
            setActiveClef,
            currentOctave,
            changeOctave,
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
            clearAll: () => {
              setNotesList([]);
              setSelectedNoteIndex(null);
            },
            selectedNoteIndex,
            keySignature,
            setKeySignature,
          }}
        />

        <div className="bg-white p-4 md:p-10 rounded-3xl shadow-xl border border-gray-200 overflow-x-auto">
          <VexFlowRenderer
            notesList={notesList}
            timeSignature={timeSignature}
            keySignature={keySignature} // <-- Nueva prop
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
