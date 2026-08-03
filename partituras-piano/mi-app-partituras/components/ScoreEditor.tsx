// src/components/ScoreEditor.tsx
"use client";
import VexFlowRenderer from "./VexFlowRender";
import { ControlPanel } from "./ControlPanel";
import Auth from "./Auth";

// Import UI Components
import { Header } from './editor/Header';
import { NoteInputPanel } from './editor/NoteInputPanel';
import { PlaybackPanel } from './editor/PlaybackPanel';

// Import Custom Hooks
import { useAuth } from "../hooks/useAuth";
import { useScore } from "../hooks/useScore";
import { useEditor } from "../hooks/useEditor";
import { useHardware } from "../hooks/useHardware";
import { useAudioPlayback } from "../hooks/useAudioPlayback";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export default function ScoreEditor() {
  // 1. Authentication Hook
  const { session, isGuest, setIsGuest, loading } = useAuth();

  // 2. Score Data and Persistence Hook
  const score = useScore(session);

  // 3. Editor Logic Hook
  const editor = useEditor({
    notesList: score.notesList,
    setNotesList: score.setNotesList,
    selectedNoteIndex: score.selectedNoteIndex,
    setSelectedNoteIndex: score.setSelectedNoteIndex,
  });

  // 4. Hardware Connection and Playback Hook
  const hardware = useHardware({ notesList: score.notesList, keySignature: score.keySignature });

  // 5. PC Audio Playback Hook
  const audio = useAudioPlayback({
    notesList: score.notesList,
    bpm: hardware.bpm,
    keySignature: score.keySignature,
  });

  // 6. Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    toggleAccidental: editor.toggleAccidental,
    setIsDotActive: editor.setIsDotActive,
    setIsTieActive: editor.setIsTieActive,
    addRest: editor.addRest,
    handleArticulationChange: editor.setArticulation,
    undoLastNote: editor.undoLastNote,
    handlePlayPC: audio.handlePlayPC,
    setCurrentDuration: editor.setCurrentDuration,
    setIsChordMode: editor.setIsChordMode,
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-lg font-semibold">Cargando...</p>
      </div>
    );
  }

  if (!session && !isGuest) {
    return <Auth onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex flex-col gap-4 p-2 md:p-6 bg-gray-100 min-h-screen">
      <Header
        session={session}
        isGuest={isGuest}
        setIsGuest={setIsGuest}
        savedScores={score.savedScores}
        handleLoadScore={score.handleLoadScore}
        handleFileUpload={score.handleFileUpload}
        title={score.title}
        setTitle={score.setTitle}
        saveScore={score.saveScore}
        isSaving={score.isSaving}
        connectionType={hardware.connectionType}
        handleConnectUSB={hardware.handleConnectUSB}
        handleConnectBLE={hardware.handleConnectBLE}
      />

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        <div className="w-full lg:w-72 flex-shrink-0 bg-white p-4 rounded-2xl shadow-xl border border-gray-200 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar z-20">
          <h2 className="text-xl font-extrabold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
            🛠️ Configuración
          </h2>
          <ControlPanel
            activeClef={editor.activeClef}
            setActiveClef={editor.setActiveClef}
            activeVoice={editor.activeVoice}
            setActiveVoice={editor.setActiveVoice}
            currentDuration={editor.currentDuration}
            setDurationAndEdit={editor.setCurrentDuration}
            isDotActive={editor.isDotActive}
            toggleDot={() => editor.setIsDotActive(!editor.isDotActive)}
            isTieActive={editor.isTieActive}
            toggleTie={() => editor.setIsTieActive(!editor.isTieActive)}
            isTripletActive={editor.isTripletActive}
            toggleTriplet={() => editor.setIsTripletActive(!editor.isTripletActive)}
            accidental={editor.accidental}
            toggleAccidental={editor.toggleAccidental}
            isChordMode={editor.isChordMode}
            setIsChordMode={editor.setIsChordMode}
            toggleRepeat={editor.toggleRepeat}
            isRepeatActive={editor.isRepeatActive}
            dynamic={editor.dynamic}
            setDynamic={editor.setDynamic}
            textAnnotation={editor.textAnnotation}
            setTextAnnotation={editor.setTextAnnotation}
            applyTextAnnotation={editor.handleApplyText}
            togglePedal={editor.togglePedal}
            articulation={editor.articulation}
            setArticulation={editor.setArticulation}
            timeSignature={score.timeSignature}
            setTimeSignature={score.setTimeSignature}
            keySignature={score.keySignature}
            setKeySignature={score.setKeySignature}
            bpm={hardware.bpm}
            setBpm={hardware.setBpm}
            onDebugHardware={hardware.handleDebugHardware}
          />
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full min-w-0">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-200 flex flex-col gap-4 w-full sticky top-4 z-20">
            <NoteInputPanel
              rowOctaves={editor.rowOctaves}
              changeRowOctave={editor.changeRowOctave}
              addSpecificNote={editor.addSpecificNote}
            />
            <PlaybackPanel
              isPlayingPC={audio.isPlayingPC}
              handlePlayPC={audio.handlePlayPC}
              isPlaying={hardware.isPlaying}
              handlePlay={hardware.handlePlay}
              connectionType={hardware.connectionType}
              addRest={editor.addRest}
              undoLastNote={editor.undoLastNote}
              clearScore={() => {
                score.setNotesList([]);
                score.setSelectedNoteIndex(null);
              }}
            />
          </div>

          <div className="bg-white p-4 md:p-10 rounded-3xl shadow-xl border border-gray-200 overflow-x-auto w-full z-0">
            <VexFlowRenderer
              notesList={score.notesList}
              timeSignature={score.timeSignature}
              keySignature={score.keySignature}
              selectedNoteIndex={score.selectedNoteIndex}
              selectedKeyIndex={editor.selectedKeyIndex}
              onNoteClick={(noteIdx, keyIdx) => {
                score.setSelectedNoteIndex(noteIdx === -1 ? null : noteIdx);
                editor.setSelectedKeyIndex(keyIdx === -1 ? null : keyIdx);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
