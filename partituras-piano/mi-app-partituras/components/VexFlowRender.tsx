// --- src/components/VexFlowRenderer.tsx ---
"use client";
import { useEffect, useRef } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  StaveConnector,
  StaveTie,
  Dot,
  Accidental,
  Beam, // ✨ Barras de corcheas
  Articulation,
} from "vexflow";
import {
  NoteData,
  calculateMeasures,
  parseTimeSignature,
} from "../utils/musicLogic";

type VexFlowRendererProps = {
  notesList: NoteData[];
  timeSignature: string;
  keySignature: string;
  selectedNoteIndex?: number | null;
  selectedKeyIndex?: number | null;
  onNoteClick?: (noteIndex: number, keyIndex: number) => void;
};

export default function VexFlowRenderer({
  notesList,
  timeSignature,
  keySignature,
  selectedNoteIndex = null,
  selectedKeyIndex = null,
  onNoteClick = () => {},
}: VexFlowRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const config = parseTimeSignature(timeSignature);

    const isValidSignature = /^\d+\/\d+$/.test(timeSignature);
    const safeSignature = isValidSignature ? timeSignature : "4/4";

    const MAX_LINE_WIDTH = 1200;
    const lineHeight = 220;

    const notesWithIndex = notesList.map((n, i) => ({
      ...n,
      originalIndex: i,
    }));

    const trebleMeasures = calculateMeasures(
      notesWithIndex.filter((n) => n.clef === "treble"),
      timeSignature,
    );
    const bassMeasures = calculateMeasures(
      notesWithIndex.filter((n) => n.clef === "bass"),
      timeSignature,
    );
    const totalMeasures = Math.max(trebleMeasures.length, bassMeasures.length);

    let currentX = 20;
    let currentY = 40;
    let numLines = 1;
    const context = renderer.getContext();
    const allTrebleVexNotes: any[] = [];
    const allBassVexNotes: any[] = [];

    for (let i = 0; i < totalMeasures; i++) {
      const tNotesData = trebleMeasures[i] || [];
      const bNotesData = bassMeasures[i] || [];

      const voices = [];
      let tVoice, bVoice;
      let tBeams: any[] = [];
      let bBeams: any[] = [];

      const createVexNotes = (
        notesData: any[],
        clef: string,
        vexNotesArray: any[],
      ) => {
        return notesData.map((note) => {
          const durString = note.isDotted ? note.duration + "d" : note.duration;
          const vNote = new StaveNote({
            clef,
            keys: note.keys,
            duration: durString,
          });

          if (note.originalIndex === selectedNoteIndex) {
            if (selectedKeyIndex !== null && selectedKeyIndex !== -1) {
              vNote.setKeyStyle(selectedKeyIndex, {
                fillStyle: "#3b82f6",
                strokeStyle: "#3b82f6",
              });
            } else {
              vNote.setStyle({ fillStyle: "#3b82f6", strokeStyle: "#3b82f6" });
            }
          }

          note.keys.forEach((keyName: string, index: number) => {
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              vNote.addModifier(new Accidental(symbol), index);
            }
          });
          if (note.articulation && note.articulation !== "none") {
            vNote.addModifier(
              new Articulation(note.articulation).setPosition(3),
              0,
            );
            // setPosition(3) fuerza a que el símbolo se dibuje arriba de la nota
          }

          if (note.isDotted) vNote.addModifier(new Dot(), 0);

          vexNotesArray.push({
            vNote,
            tieNext: note.tieNext,
            originalIndex: note.originalIndex,
          });
          return vNote;
        });
      };

      if (tNotesData.length > 0) {
        const vexNotes = createVexNotes(
          tNotesData,
          "treble",
          allTrebleVexNotes,
        );
        tVoice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        tVoice.addTickables(vexNotes);
        voices.push(tVoice);

        tBeams = Beam.generateBeams(vexNotes);
      }

      if (bNotesData.length > 0) {
        const vexNotes = createVexNotes(bNotesData, "bass", allBassVexNotes);
        bVoice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        bVoice.addTickables(vexNotes);
        voices.push(bVoice);

        bBeams = Beam.generateBeams(vexNotes);
      }

      const formatter = new Formatter();
      let minNoteWidth = 40;

      const maxNotes = Math.max(tNotesData.length, bNotesData.length);

      if (voices.length > 0) {
        formatter.joinVoices(voices);
        minNoteWidth = formatter.preCalculateMinTotalWidth
          ? formatter.preCalculateMinTotalWidth(voices)
          : 100;
      }

      // ✨ Ancho dinámico con espacio para respirar
      const breathingRoom = maxNotes * 25 + 30;
      const finalNoteWidth = minNoteWidth + breathingRoom;

      let isFirstInLine = currentX === 20;
      let padding = isFirstInLine ? 140 : 50;

      let measureWidth = finalNoteWidth + padding;

      if (currentX + measureWidth > MAX_LINE_WIDTH && !isFirstInLine) {
        currentX = 20;
        currentY += lineHeight;
        numLines++;
        isFirstInLine = true;
        padding = 140;
        measureWidth = finalNoteWidth + padding;
      }

      const trebleStave = new Stave(currentX, currentY, measureWidth);
      const bassStave = new Stave(currentX, currentY + 100, measureWidth);

      if (isFirstInLine) {
        trebleStave
          .addClef("treble")
          .addKeySignature(keySignature)
          .addTimeSignature(safeSignature);
        bassStave
          .addClef("bass")
          .addKeySignature(keySignature)
          .addTimeSignature(safeSignature);
        new StaveConnector(trebleStave, bassStave)
          .setType(3)
          .setContext(context)
          .draw();
      }
      new StaveConnector(trebleStave, bassStave)
        .setType(1)
        .setContext(context)
        .draw();

      trebleStave.setContext(context).draw();
      bassStave.setContext(context).draw();

      if (voices.length > 0) {
        formatter.format(voices, measureWidth - padding);
        if (tVoice) tVoice.draw(context, trebleStave);
        if (bVoice) bVoice.draw(context, bassStave);

        tBeams.forEach((b) => b.setContext(context).draw());
        bBeams.forEach((b) => b.setContext(context).draw());
      }

      currentX += measureWidth;
    } // FIN DEL BUCLE FOR

    const drawTies = (vexNotesArray: any[]) => {
      for (let i = 0; i < vexNotesArray.length - 1; i++) {
        if (vexNotesArray[i].tieNext && vexNotesArray[i + 1]) {
          const keysCount = vexNotesArray[i].vNote.getKeys().length;
          const indices = Array.from({ length: keysCount }, (_, idx) => idx);

          new StaveTie({
            firstNote: vexNotesArray[i].vNote,
            lastNote: vexNotesArray[i + 1].vNote,
            firstIndices: indices,
            lastIndices: indices,
          } as any)
            .setContext(context)
            .draw();
        }
      }
    };

    drawTies(allTrebleVexNotes);
    drawTies(allBassVexNotes);

    renderer.resize(MAX_LINE_WIDTH + 50, numLines * lineHeight + 50);

    const injectDOMAttributes = (vexNotesArray: any[]) => {
      vexNotesArray.forEach((item) => {
        const svgElement = item.vNote.getSVGElement();
        if (svgElement) {
          svgElement.setAttribute("id", "note-" + item.originalIndex);
          svgElement.classList.add("clickable-note");

          if (item.vNote.note_heads && item.vNote.note_heads.length > 0) {
            item.vNote.note_heads.forEach(
              (noteHead: any, headIndex: number) => {
                const headSvg = noteHead.getSVGElement();
                if (headSvg) {
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
                }
              },
            );
          }
        }
      });
    };

    injectDOMAttributes(allTrebleVexNotes);
    injectDOMAttributes(allBassVexNotes);
  }, [
    notesList,
    timeSignature,
    keySignature,
    selectedNoteIndex,
    selectedKeyIndex,
  ]); // <-- ¡Aquí es donde daba el error por la llave perdida arriba!

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;

    const noteHeadGroup = target.closest(".clickable-notehead");
    if (noteHeadGroup) {
      e.stopPropagation();
      const id = noteHeadGroup.getAttribute("id");
      if (id && id.startsWith("notehead-")) {
        const [, noteIdx, keyIdx] = id.split("-");
        onNoteClick(parseInt(noteIdx, 10), parseInt(keyIdx, 10));
        return;
      }
    }

    const noteGroup = target.closest(".clickable-note");
    if (noteGroup) {
      const id = noteGroup.getAttribute("id");
      if (id && id.startsWith("note-")) {
        const index = parseInt(id.replace("note-", ""), 10);
        onNoteClick(index, -1);
        return;
      }
    }

    onNoteClick(-1, -1);
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto select-none"
      onClick={handleContainerClick}
    />
  );
}
