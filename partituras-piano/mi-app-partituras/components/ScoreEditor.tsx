// src/components/ScoreEditor.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { NoteData, getBeats } from "../utils/musicLogic";
import VexFlowRenderer from "./VexFlowRender";
import { supabase } from "../utils/superbaseClient";
import { ControlPanel } from "./ControlPanel";

import { translateToHardware } from "../utils/hardwareTranslator";
import { serialService } from "../utils/webSerialService";

import { parseMusicXML } from "../utils/musicXMLParser";

export default function ScoreEditor() {
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
  const [accidental, setAccidental] = useState<"none" | "#" | "b" | "n">(
    "none",
  );
  const [title, setTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedScores, setSavedScores] = useState<any[]>([]);
  const [keySignature, setKeySignature] = useState<string>("C");
  const [activeVoice, setActiveVoice] = useState<number>(1);
  const [isTripletActive, setIsTripletActive] = useState<boolean>(false);

  const [dynamic, setDynamic] = useState<string>("none");
  const [textAnnotation, setTextAnnotation] = useState<string>("");

  const [bpm, setBpm] = useState<number>(60);

  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

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

  const handleLoadScore = (scoreId: string) => {
    const score = savedScores.find((s) => s.id.toString() === scoreId);
    if (score) {
      setNotesList(score.content);
      setTitle(score.title);
      setTimeSignature(score.time_signature || "4/4");
      setKeySignature(score.key_signature || "C");
      setSelectedNoteIndex(null);
    }
  };

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlText = e.target?.result as string;
      try {
        const parsedNotes = parseMusicXML(xmlText);
        setNotesList(parsedNotes);
        setTitle(file.name.replace(".musicxml", ""));
        alert("✅ Partitura cargada con éxito.");
      } catch (error) {
        console.error(error);
        alert("❌ Error al leer el archivo MusicXML.");
      }
    };
    reader.readAsText(file);
  };

  const saveScore = async () => {
    if (!title) return alert("⚠️ Ponle un título.");
    setIsSaving(true);
    const { error } = await supabase.from("scores").insert([
      {
        title,
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

  const toggleAccidental = (targetAcc: "#" | "b" | "n") => {
    setAccidental(accidental === targetAcc ? "none" : targetAcc);
  };

  const isRepeatActive =
    selectedNoteIndex !== null
      ? !!notesList[selectedNoteIndex].hasEndRepeat
      : false;

  const toggleRepeat = () => {
    if (selectedNoteIndex !== null) {
      updateSelectedNoteProperty((note) => ({
        ...note,
        hasEndRepeat: !note.hasEndRepeat,
      }));
    } else {
      alert(
        "⚠️ Selecciona una nota en el pentagrama para poner la barra de repetición al final de su compás.",
      );
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
        textAnnotation:
          textAnnotation.trim() === "" ? undefined : textAnnotation.trim(),
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

  const syncVoicePointer = (
    targetVoice: number,
    targetBeatPosition?: number,
  ) => {
    const currentVoiceNotes = notesList.filter(
      (n) => (n.voice || 1) === targetVoice && n.clef === activeClef,
    );
    let currentVoiceBeats = 0;
    currentVoiceNotes.forEach((n) => {
      currentVoiceBeats += getBeats(n.duration, n.isDotted, n.isTriplet);
    });

    let goalBeats = targetBeatPosition || 0;
    if (!targetBeatPosition) {
      const otherVoiceNotes = notesList.filter(
        (n) => (n.voice || 1) !== targetVoice && n.clef === activeClef,
      );
      otherVoiceNotes.forEach((n) => {
        goalBeats += getBeats(n.duration, n.isDotted, n.isTriplet);
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
      if (newRests.length > 0) setNotesList((prev) => [...prev, ...newRests]);
    }
  };

  const handleVoiceChange = (newVoice: number) => {
    let targetBeat = 0;
    if (selectedNoteIndex !== null) {
      const selectedNote = notesList[selectedNoteIndex];
      const sameClefNotes = notesList.filter(
        (n) =>
          n.clef === selectedNote.clef &&
          (n.voice || 1) === (selectedNote.voice || 1),
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
        isTriplet: isTripletActive,
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
        newList[selectedNoteIndex] = {
          keys: [restKey],
          duration: noteToEdit.duration.replace("r", "") + "r",
          clef: noteToEdit.clef,
          isDotted: noteToEdit.isDotted,
          manualTie: false,
          voice: noteToEdit.voice || 1,
        };
        if (selectedNoteIndex > 0 && newList[selectedNoteIndex - 1])
          newList[selectedNoteIndex - 1] = {
            ...newList[selectedNoteIndex - 1],
            manualTie: false,
          };
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
      newList[lastVoiceIndex] = {
        ...lastNote,
        keys: lastNote.keys.slice(0, -1),
      };
    } else {
      newList.splice(lastVoiceIndex, 1);
    }
    setNotesList(newList);
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
        isTriplet: isTripletActive,
      },
    ]);
  };

  const handleDebugHardware = () => {
    if (notesList.length === 0) return alert("⚠️ No hay notas.");
    const safeBpm = bpm > 0 ? bpm : 60;
    const data = translateToHardware(notesList, safeBpm, keySignature);

    console.log(`=== DATOS PARA PIANO AUTOMÁTICO (${safeBpm} BPM) ===`);
    console.log("NOTAS:", data.notes);
    console.log("PEDAL:", data.pedal);

    alert(
      `✅ Datos generados a ${safeBpm} BPM.\nRevisa la consola (F12) para ver los tiempos en milisegundos.`,
    );
  };

  const handleConnect = async () => {
    if (isConnected) {
      await serialService.disconnect();
      setIsConnected(false);
      return;
    }
    const success = await serialService.connect();
    setIsConnected(success);
    if (success) alert("🎹 Piano conectado correctamente por USB");
  };

  const handlePlay = () => {
    if (isPlaying) {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      setIsPlaying(false);
      for (let i = 0; i < 88; i++) serialService.sendCommand(`OFF,${i}`);
      return;
    }

    if (notesList.length === 0)
      return alert("⚠️ No hay notas para reproducir.");

    setIsPlaying(true);
    const safeBpm = bpm > 0 ? bpm : 60;
    const data = translateToHardware(notesList, safeBpm, keySignature);

    data.notes.leds.forEach((led, i) => {
      const start = data.notes.starts[i];
      const duration = data.notes.durs[i];
      const velocity = data.notes.vels[i];

      const onTimeout = setTimeout(() => {
        serialService.sendCommand(`ON,${led},${velocity}`);
      }, start);

      const offTimeout = setTimeout(() => {
        serialService.sendCommand(`OFF,${led}`);
      }, start + duration);

      timeoutsRef.current.push(onTimeout, offTimeout);
    });

    const totalDuration =
      data.notes.starts.length > 0
        ? Math.max(...data.notes.starts.map((s, i) => s + data.notes.durs[i]))
        : 0;

    const finishTimeout = setTimeout(() => {
      setIsPlaying(false);
      for (let i = 0; i < 88; i++) serialService.sendCommand(`OFF,${i}`);
    }, totalDuration + 500);

    timeoutsRef.current.push(finishTimeout);
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-2 md:p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm w-full">
        <select
          className="px-4 py-2.5 rounded-xl border border-blue-200 shadow-sm focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 bg-blue-50 w-full sm:w-auto cursor-pointer outline-none"
          onChange={(e) => handleLoadScore(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            📂 Abrir Obra Guardada...
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
          <input
            type="file"
            accept=".musicxml,.xml"
            onChange={handleFileUpload}
            className="hidden"
          />
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
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:bg-blue-300 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isSaving ? "⏳..." : "💾 Guardar"}
          </button>

          <button
            onClick={handleConnect}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${isConnected ? "bg-green-100 text-green-700 border-2 border-green-500" : "bg-gray-800 text-white hover:bg-gray-900"}`}
          >
            {isConnected ? "✅ Conectado" : "🔌 Conectar USB"}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        <div className="w-full lg:w-72 flex-shrink-0 bg-white p-4 rounded-2xl shadow-xl border border-gray-200 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar z-20">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
            🛠️ Configuración
          </h2>
          <ControlPanel
            {...{
              activeClef,
              setActiveClef,
              activeVoice,
              setActiveVoice: handleVoiceChange,
              currentDuration,
              setDurationAndEdit: (d: string) => setCurrentDuration(d),
              isDotActive,
              toggleDot: () => setIsDotActive(!isDotActive),
              isTieActive,
              toggleTie: () => setIsTieActive(!isTieActive),
              isTripletActive,
              toggleTriplet: () => setIsTripletActive(!isTripletActive),
              accidental,
              toggleAccidental,
              isChordMode,
              setIsChordMode,
              toggleRepeat,
              isRepeatActive,
              dynamic,
              setDynamic: handleDynamicChange,
              textAnnotation,
              setTextAnnotation,
              applyTextAnnotation: handleApplyText,
              togglePedal,
              articulation,
              setArticulation: handleArticulationChange,
              timeSignature,
              setTimeSignature,
              keySignature,
              setKeySignature,
              bpm,
              setBpm,
              onDebugHardware: handleDebugHardware,
            }}
          />
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full min-w-0">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-200 flex flex-col gap-4 w-full sticky top-4 z-20">
            <div className="flex flex-col gap-3">
              {rowOctaves.map((octave, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex flex-col sm:flex-row items-center gap-3 w-full"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 w-full sm:w-auto shrink-0">
                    <span className="text-xs font-bold text-orange-700">
                      OCTAVA
                    </span>
                    <button
                      onClick={() => changeRowOctave(rowIndex, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-orange-600 font-bold border border-orange-300 hover:bg-orange-100 transition"
                    >
                      -
                    </button>
                    <span className="font-bold text-orange-900 w-4 text-center">
                      {octave}
                    </span>
                    <button
                      onClick={() => changeRowOctave(rowIndex, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-orange-600 font-bold border border-orange-300 hover:bg-orange-100 transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex w-full gap-1.5 flex-wrap">
                    {["c", "d", "e", "f", "g", "a", "b"].map(
                      (noteKey, noteIndex) => {
                        const labels = [
                          "Do",
                          "Re",
                          "Mi",
                          "Fa",
                          "Sol",
                          "La",
                          "Si",
                        ];
                        return (
                          <button
                            key={noteKey}
                            onClick={() => addSpecificNote(noteKey, rowIndex)}
                            className="flex-1 min-w-[40px] py-2 bg-white border border-gray-300 rounded-lg shadow-sm font-bold text-gray-700 text-sm sm:text-base hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all focus:ring-2 focus:ring-blue-500"
                          >
                            {labels[noteIndex]}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handlePlay}
                disabled={!isConnected}
                className={`flex-1 min-w-[140px] py-2.5 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm ${
                  isPlaying
                    ? "bg-red-100 text-red-700 border-2 border-red-500 hover:bg-red-200"
                    : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
                }`}
              >
                {isPlaying
                  ? "⏹️ Detener Reproducción"
                  : "▶️ Reproducir en Piano"}
              </button>

              <button
                onClick={addRest}
                className="flex-1 min-w-[100px] py-2.5 bg-gray-800 text-white font-bold rounded-xl shadow hover:bg-gray-900 transition flex items-center justify-center gap-2 text-sm"
              >
                𝄽 Silencio
              </button>
              <button
                onClick={undoLastNote}
                className="flex-1 min-w-[100px] py-2.5 bg-yellow-500 text-white font-bold rounded-xl shadow hover:bg-yellow-600 transition flex items-center justify-center gap-2 text-sm"
              >
                ↩️ Deshacer
              </button>
              <button
                onClick={() => {
                  setNotesList([]);
                  setSelectedNoteIndex(null);
                }}
                className="flex-1 min-w-[100px] py-2.5 bg-red-500 text-white font-bold rounded-xl shadow hover:bg-red-600 transition flex items-center justify-center gap-2 text-sm"
              >
                🗑️ Limpiar Todo
              </button>
            </div>
          </div>

          <div className="bg-white p-4 md:p-10 rounded-3xl shadow-xl border border-gray-200 overflow-x-auto w-full z-0">
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
    </div>
  );
}
