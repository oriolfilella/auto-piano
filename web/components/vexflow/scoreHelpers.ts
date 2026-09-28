import { Curve, PedalMarking, StaveTie } from "vexflow";
import type { NoteData } from "../../utils/musicLogic";
import type { NoteRenderInfo, RenderNote } from "./types";

export const normalizeVoices = (notes: RenderNote[]) => {
  const uniqueVoices = Array.from(
    new Set(notes.map((note) => note.voice || 1)),
  ).sort((a, b) => a - b);

  return notes.map((note) => ({
    ...note,
    normalizedVoice: uniqueVoices.indexOf(note.voice || 1) + 1,
  }));
};

export const drawTies = (array: NoteRenderInfo[], context: any) => {
  for (let i = 0; i < array.length - 1; i += 1) {
    const current = array[i];
    const next = array[i + 1];

    if (!current?.manualTie || !current.vNote || !next?.vNote) continue;

    const keysCount = current.vNote.getKeys?.().length || 1;
    const indices = Array.from({ length: keysCount }, (_, index) => index);

    try {
      new StaveTie({
        firstNote: current.vNote,
        lastNote: next.vNote,
        firstIndexes: indices,
        lastIndexes: indices,
      })
        .setContext(context)
        .draw();
    } catch (error) {
      console.warn("No se pudo dibujar la ligadura:", error);
    }
  }
};

export const drawPedals = (
  allNotesForDOM: NoteRenderInfo[],
  notesList: NoteData[],
  context: any,
) => {
  let currentStart: any = null;

  const sortedNotes = [...allNotesForDOM].sort(
    (a, b) => a.originalIndex - b.originalIndex,
  );

  sortedNotes.forEach((item) => {
    const noteData = notesList[item.originalIndex];
    if (!noteData) return;

    if (noteData.pedal === "start") {
      currentStart = item.vNote;
    } else if (noteData.pedal === "stop" && currentStart) {
      new PedalMarking([currentStart, item.vNote]).setContext(context).draw();
      currentStart = null;
    }
  });
};

export const drawSlurs = (
  allNotesForDOM: NoteRenderInfo[],
  notesList: NoteData[],
  context: any,
) => {
  let currentSlurStart: any = null;

  const sortedNotes = [...allNotesForDOM].sort(
    (a, b) => a.originalIndex - b.originalIndex,
  );

  sortedNotes.forEach((item) => {
    const noteData = notesList[item.originalIndex];
    if (!noteData) return;

    if (noteData.slur === "start") {
      currentSlurStart = item.vNote;
    } else if (noteData.slur === "stop" && currentSlurStart) {
      try {
        new Curve(currentSlurStart, item.vNote, {
          thickness: 2,
          xShift: 0,
          yShift: 10,
        })
          .setContext(context)
          .draw();
      } catch (error) {
        console.warn("No se pudo dibujar el Slur:", error);
      }
      currentSlurStart = null;
    }
  });
};

export const attachNoteDomIds = (allNotesForDOM: NoteRenderInfo[]) => {
  allNotesForDOM.forEach((item) => {
    const svgElement = item.vNote.getSVGElement?.();
    if (!svgElement) return;

    svgElement.setAttribute("id", `note-${item.originalIndex}`);
    svgElement.classList.add("clickable-note");

    if (item.vNote.note_heads && item.vNote.note_heads.length > 0) {
      item.vNote.note_heads.forEach((noteHead: any, headIndex: number) => {
        const headSvg = noteHead.getSVGElement();
        if (!headSvg) return;

        const paths = headSvg.querySelectorAll("path");
        paths.forEach((path: SVGElement) => {
          path.setAttribute(
            "id",
            `notehead-${item.originalIndex}-${headIndex}`,
          );
          path.classList.add("clickable-notehead");
          path.style.pointerEvents = "all";
          path.style.cursor = "pointer";
        });
      });
    }
  });
};
