import type { NoteData } from "../../utils/musicLogic";

export type VexFlowRendererProps = {
  notesList: NoteData[];
  timeSignature: string;
  keySignature: string;
  selectedNoteIndex?: number | null;
  selectedKeyIndex?: number | null;
  onNoteClick?: (noteIndex: number, keyIndex: number) => void;
};

export type RenderNote = NoteData & {
  originalIndex?: number;
  normalizedVoice?: number;
  voice?: number;
};

export type MeasureLayer = {
  data: RenderNote[];
  clef: "treble" | "bass";
  voiceNum: number;
};

export type NoteRenderInfo = {
  vNote: any;
  manualTie: boolean;
  originalIndex: number;
};

export type VoiceRenderObject = {
  voice: any;
  clef: "treble" | "bass";
};
