// hooks/useEditor.ts
import { useState, useEffect } from "react";
import { NoteData, getBeats } from "../utils/musicLogic";

// Las props que el hook necesita de otros hooks o componentes
interface UseEditorProps {
  notesList: NoteData[];
  setNotesList: React.Dispatch<React.SetStateAction<NoteData[]>>;
  selectedNoteIndex: number | null;
  setSelectedNoteIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useEditor({ notesList, setNotesList, selectedNoteIndex, setSelectedNoteIndex }: UseEditorProps) {
  const [currentDuration, setCurrentDuration] = useState<string>("q");
  const [activeClef, setActiveClef] = useState<"treble" | "bass">("treble");
  const [isDotActive, setIsDotActive] = useState<boolean>(false);
  const [isTieActive, setIsTieActive] = useState<boolean>(false);
  const [isChordMode, setIsChordMode] = useState<boolean>(false);
  const [articulation, setArticulation] = useState<string>("none");
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number | null>(null);
  const [rowOctaves, setRowOctaves] = useState<number[]>([5, 4, 3]);
  const [accidental, setAccidental] = useState<"none" | "#" | "b" | "n">("none");
  const [activeVoice, setActiveVoice] = useState<number>(1);
  const [isTripletActive, setIsTripletActive] = useState<boolean>(false);
  const [dynamic, setDynamic] = useState<string>("none");
  const [textAnnotation, setTextAnnotation] = useState<string>("");

  useEffect(() => {
    if (selectedNoteIndex !== null && notesList[selectedNoteIndex]) {
      const note = notesList[selectedNoteIndex];
      setArticulation(note.articulation || "none");
      setDynamic(note.dynamic || "none");
      setTextAnnotation(note.textAnnotation || "");
    } else {
      setArticulation("none");
      setDynamic("none");
      setTextAnnotation("");
    }
  }, [selectedNoteIndex, notesList]);

  const updateSelectedNoteProperty = (updater: (note: NoteData) => NoteData) => {
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

  const toggleAccidental = (targetAcc: "#" | "b" | "n") => {
    setAccidental(accidental === targetAcc ? "none" : targetAcc);
  };

  const isRepeatActive = selectedNoteIndex !== null ? !!notesList[selectedNoteIndex]?.hasEndRepeat : false;

  const toggleRepeat = () => {
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        hasEndRepeat: !note.hasEndRepeat,
      }));
    } else {
      alert("⚠️ Selecciona una nota en el pentagrama para poner la barra de repetición al final de su compás.");
    }
  };

  const handleArticulationChange = (newArt: string) => {
    setArticulation(newArt);
    if (selectedNoteIndex !== null)
      updateSelectedNoteProperty((note) => ({
        ...note,
        articulation: newArt === "none" ? undefined : newArt,
      }));
  };

  const handleDynamicChange = (newDyn: string) => {
    setDynamic(newDyn);
    if (selectedNoteIndex !== null)
      updateSelectedNoteProperty((note) => ({
        ...note,
        dynamic: newDyn === "none" ? undefined : newDyn,
      }));
  };
  
  const handleApplyText = () => {
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        textAnnotation: textAnnotation.trim() === "" ? undefined : textAnnotation.trim(),
      }));
    } else {
      alert("⚠️ Selecciona una nota para añadirle texto.");
    }
  };

  const togglePedal = (type: "start" | "stop") => {
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        pedal: note.pedal === type ? undefined : type,
      }));
    } else {
      alert("⚠️ Selecciona una nota para marcar el inicio o fin del pedal.");
    }
  };

  const syncVoicePointer = (targetVoice: number, targetBeatPosition?: number) => {
    const currentVoiceNotes = notesList.filter((n) => (n.voice || 1) === targetVoice && n.clef === activeClef);
    let currentVoiceBeats = 0;
    currentVoiceNotes.forEach((n) => {
      currentVoiceBeats += getBeats(n.duration, n.isDotted, n.isTriplet);
    });

    let goalBeats = targetBeatPosition || 0;
    if (!targetBeatPosition) {
      const otherVoiceNotes = notesList.filter((n) => (n.voice || 1) !== targetVoice && n.clef === activeClef);
      otherVoiceNotes.forEach((n) => {
        goalBeats += getBeats(n.duration, n.isDotted, n.isTriplet);
      });
    }

    if (currentVoiceBeats < goalBeats) {
      let remaining = goalBeats - currentVoiceBeats;
      const newRests: NoteData[] = [];
      const restKey = activeClef === "treble" ? "b/4" : "d/3";

      while (remaining >= 1) {
        newRests.push({ keys: [restKey], duration: "qr", clef: activeClef, voice: targetVoice, isInvisible: true });
        remaining -= 1;
      }
      if (remaining >= 0.5) {
        newRests.push({ keys: [restKey], duration: "8r", clef: activeClef, voice: targetVoice, isInvisible: true });
      }
      if (newRests.length > 0) setNotesList((prev) => [...prev, ...newRests]);
    }
  };

  const handleVoiceChange = (newVoice: number) => {
    let targetBeat = 0;
    if (selectedNoteIndex !== null) {
      const selectedNote = notesList[selectedNoteIndex];
      const sameClefNotes = notesList.filter(
        (n) => n.clef === selectedNote.clef && (n.voice || 1) === (selectedNote.voice || 1),
      );
      for (let n of sameClefNotes) {
        if (n === selectedNote) break;
        targetBeat += getBeats(n.duration, n.isDotted, n.isTriplet);
      }
      setSelectedNoteIndex(null);
      setSelectedKeyIndex(null);
    }
    setActiveVoice(newVoice);
    syncVoicePointer(newVoice, targetBeat);
  };
  
  const addSpecificNote = (noteKey: string, rowIndex: number) => {
    const octaveToUse = rowOctaves[rowIndex];
    const keyToUse = accidental === "none" ? `${noteKey}/${octaveToUse}` : `${noteKey}${accidental}/${octaveToUse}`;

    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => {
        const newDuration = note.duration.replace("r", "");
        if (isChordMode && !note.duration.includes("r")) {
          if (note.keys.includes(keyToUse)) return note;
          return { ...note, keys: [...note.keys, keyToUse].sort(), duration: newDuration };
        }
        if (!isChordMode && selectedKeyIndex !== null && selectedKeyIndex !== -1) {
          const newKeys = [...note.keys];
          newKeys[selectedKeyIndex] = keyToUse;
          return { ...note, keys: newKeys.sort(), duration: newDuration };
        }
        return { ...note, keys: [keyToUse], clef: activeClef, duration: newDuration };
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
      updatedList[lastIndex] = { ...updatedList[lastIndex], keys: [...updatedList[lastIndex].keys, keyToUse].sort() };
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
        isTriplet: isTripletActive,
      };
      if (isTieActive && notesList.length > 0) {
        const updatedList = [...notesList];
        updatedList[updatedList.length - 1] = { ...updatedList[updatedList.length - 1], manualTie: true };
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
      if (selectedKeyIndex !== null && selectedKeyIndex !== -1 && noteToEdit.keys.length > 1) {
        const newKeys = [...noteToEdit.keys];
        newKeys.splice(selectedKeyIndex, 1);
        newList[selectedNoteIndex] = { ...noteToEdit, keys: newKeys };
      } else {
        const restKey = noteToEdit.clef === "treble" ? "b/4" : "d/3";
        newList[selectedNoteIndex] = {
          keys: [restKey],
          duration: noteToEdit.duration.replace("r", "") + "r",
          clef: noteToEdit.clef,
          isDotted: noteToEdit.isDotted,
          manualTie: false,
          voice: noteToEdit.voice || 1,
        };
        if (selectedNoteIndex > 0 && newList[selectedNoteIndex - 1])
          newList[selectedNoteIndex - 1] = { ...newList[selectedNoteIndex - 1], manualTie: false };
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
      newList[lastVoiceIndex] = { ...lastNote, keys: lastNote.keys.slice(0, -1) };
    } else {
      newList.splice(lastVoiceIndex, 1);
    }
    setNotesList(newList);
  };

  const addRest = () => {
    const defaultOctave = rowOctaves[1];
    const restKey = activeClef === "treble" ? `b/${defaultOctave}` : `d/${defaultOctave - 1}`;
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
        isTriplet: isTripletActive,
      },
    ]);
  };


  return {
    // State
    currentDuration,
    activeClef,
    isDotActive,
    isTieActive,
    isChordMode,
    articulation,
    selectedKeyIndex,
    rowOctaves,
    accidental,
    activeVoice,
    isTripletActive,
    dynamic,
    textAnnotation,
    
    // Setters
    setCurrentDuration,
    setActiveClef,
    setIsDotActive,
    setIsTieActive,
    setIsChordMode,
    setArticulation: handleArticulationChange,
    setSelectedKeyIndex,
    setRowOctaves,
    setAccidental,
    setActiveVoice: handleVoiceChange,
    setIsTripletActive,
    setDynamic: handleDynamicChange,
    setTextAnnotation,

    // Logic Functions
    changeRowOctave,
    toggleAccidental,
    isRepeatActive,
    toggleRepeat,
    handleApplyText,
    togglePedal,
    addSpecificNote,
    undoLastNote,
    addRest
  };
}
