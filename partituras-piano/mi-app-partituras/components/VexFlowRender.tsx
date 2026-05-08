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
} from "vexflow";
import {
  NoteData,
  calculateMeasures,
  signatureConfig,
} from "../utils/musicLogic";

type VexFlowRendererProps = {
  notesList: NoteData[];
  timeSignature: string;
  selectedNoteIndex?: number | null;
  onNoteClick?: (index: number) => void;
};

export default function VexFlowRenderer({
  notesList,
  timeSignature,
  selectedNoteIndex = null,
  onNoteClick = () => {},
}: VexFlowRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const config = signatureConfig[timeSignature];
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

    // Aquí guardaremos las notas generadas PARA MANIPULAR EL DOM DESPUÉS
    const allTrebleVexNotes: any[] = [];
    const allBassVexNotes: any[] = [];

    for (let i = 0; i < totalMeasures; i++) {
      const tNotesData = trebleMeasures[i] || [];
      const bNotesData = bassMeasures[i] || [];

      const maxNotes = Math.max(tNotesData.length, bNotesData.length);
      let measureWidth = 80 + maxNotes * 40;

      const isFirstInLine = currentX === 20;
      if (isFirstInLine) measureWidth += 50;

      if (currentX + measureWidth > MAX_LINE_WIDTH) {
        currentX = 20;
        currentY += lineHeight;
        numLines++;
        measureWidth += 50;
      }

      const trebleStave = new Stave(currentX, currentY, measureWidth);
      const bassStave = new Stave(currentX, currentY + 100, measureWidth);

      if (currentX === 20) {
        trebleStave.addClef("treble").addTimeSignature(timeSignature);
        bassStave.addClef("bass").addTimeSignature(timeSignature);
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

      const voices = [];
      let tVoice, bVoice;

      if (tNotesData.length > 0) {
        const vexNotes = tNotesData.map((note) => {
          const durString = note.isDotted ? note.duration + "d" : note.duration;
          const vNote = new StaveNote({
            clef: "treble",
            keys: note.keys,
            duration: durString,
          });

          // Solo aplicamos estilos visuales previos
          if (note.originalIndex === selectedNoteIndex) {
            vNote.setStyle({ fillStyle: "#3b82f6", strokeStyle: "#3b82f6" });
          }

          note.keys.forEach((keyName: string, index: number) => {
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          if (note.isDotted) vNote.addModifier(new Dot(), 0);

          // GUARDAMOS LA NOTA JUNTO CON SU ÍNDICE ORIGINAL
          allTrebleVexNotes.push({
            vNote,
            tieNext: note.tieNext,
            originalIndex: note.originalIndex,
          });
          return vNote;
        });
        tVoice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        tVoice.addTickables(vexNotes);
        voices.push(tVoice);
      }

      if (bNotesData.length > 0) {
        const vexNotes = bNotesData.map((note) => {
          const durString = note.isDotted ? note.duration + "d" : note.duration;
          const vNote = new StaveNote({
            clef: "bass",
            keys: note.keys,
            duration: durString,
          });

          if (note.originalIndex === selectedNoteIndex) {
            vNote.setStyle({ fillStyle: "#3b82f6", strokeStyle: "#3b82f6" });
          }

          note.keys.forEach((keyName: string, index: number) => {
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          if (note.isDotted) vNote.addModifier(new Dot(), 0);

          // GUARDAMOS LA NOTA JUNTO CON SU ÍNDICE ORIGINAL
          allBassVexNotes.push({
            vNote,
            tieNext: note.tieNext,
            originalIndex: note.originalIndex,
          });
          return vNote;
        });
        bVoice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        bVoice.addTickables(vexNotes);
        voices.push(bVoice);
      }

      // AQUÍ ES DONDE VEXFLOW PINTA EL SVG
      if (voices.length > 0) {
        new Formatter()
          .joinVoices(voices)
          .format(voices, measureWidth - (currentX === 20 ? 80 : 30));
        if (tVoice) tVoice.draw(context, trebleStave);
        if (bVoice) bVoice.draw(context, bassStave);
      }

      currentX += measureWidth;
    }

    const drawTies = (vexNotesArray: any[]) => {
      for (let i = 0; i < vexNotesArray.length - 1; i++) {
        if (vexNotesArray[i].tieNext && vexNotesArray[i + 1]) {
          new StaveTie({
            firstNote: vexNotesArray[i].vNote,
            lastNote: vexNotesArray[i + 1].vNote,
            firstIndices: [0],
            lastIndices: [0],
          } as any)
            .setContext(context)
            .draw();
        }
      }
    };

    drawTies(allTrebleVexNotes);
    drawTies(allBassVexNotes);

    renderer.resize(MAX_LINE_WIDTH + 50, numLines * lineHeight + 50);

    // 🔥 EL TRUCO MAESTRO 🔥
    // Después de que VexFlow haya terminado de dibujar, inyectamos los IDs y clases directamente al DOM real
    const injectDOMAttributes = (vexNotesArray: any[]) => {
      vexNotesArray.forEach((item) => {
        // Obtenemos el elemento SVG real <g> de esta nota específica
        const svgElement = item.vNote.getSVGElement();
        if (svgElement) {
          svgElement.setAttribute("id", "note-" + item.originalIndex);
          svgElement.classList.add("clickable-note");
        }
      });
    };

    injectDOMAttributes(allTrebleVexNotes);
    injectDOMAttributes(allBassVexNotes);
  }, [notesList, timeSignature, selectedNoteIndex]);

  // MANEJADOR DE CLICS
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;

    // Buscamos si el clic provino de dentro de un elemento con nuestra clase
    const noteGroup = target.closest(".clickable-note");

    if (noteGroup) {
      const id = noteGroup.getAttribute("id");
      if (id && id.startsWith("note-")) {
        const index = parseInt(id.replace("note-", ""), 10);
        onNoteClick(index);
        return;
      }
    }

    // Si pulsamos fuera de una nota, quitamos la selección
    onNoteClick(-1);
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto select-none"
      onClick={handleContainerClick}
    />
  );
}
