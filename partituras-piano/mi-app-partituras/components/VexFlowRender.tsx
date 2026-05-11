// --- src/components/VexFlowRenderer.tsx ---
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
  Beam,
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

    // Guardamos el índice original para que los clics funcionen
    const notesWithIndex = notesList.map((n, i) => ({
      ...n,
      originalIndex: i,
    }));

    // 🔥 MAGIA: Separamos las listas por Clave y por Voz ANTES de calcular los compases
    const tNotesV1 = notesWithIndex.filter(
      (n) => n.clef === "treble" && (n.voice || 1) === 1,
    );
    const tNotesV2 = notesWithIndex.filter(
      (n) => n.clef === "treble" && n.voice === 2,
    );
    const bNotesV1 = notesWithIndex.filter(
      (n) => n.clef === "bass" && (n.voice || 1) === 1,
    );
    const bNotesV2 = notesWithIndex.filter(
      (n) => n.clef === "bass" && n.voice === 2,
    );

    const tMeasuresV1 = calculateMeasures(tNotesV1, timeSignature);
    const tMeasuresV2 = calculateMeasures(tNotesV2, timeSignature);
    const bMeasuresV1 = calculateMeasures(bNotesV1, timeSignature);
    const bMeasuresV2 = calculateMeasures(bNotesV2, timeSignature);

    const totalMeasures = Math.max(
      tMeasuresV1.length,
      tMeasuresV2.length,
      bMeasuresV1.length,
      bMeasuresV2.length,
    );

    let currentX = 20;
    let currentY = 40;
    let numLines = 1;
    const context = renderer.getContext();

    // Arrays para guardar las notas y los empates (ties) por separado
    const allNotesForDOM: any[] = [];
    const allTiesV1: any[] = [];
    const allTiesV2: any[] = [];

    for (let i = 0; i < totalMeasures; i++) {
      const measureData = [
        { data: tMeasuresV1[i] || [], clef: "treble", voiceNum: 1 },
        { data: tMeasuresV2[i] || [], clef: "treble", voiceNum: 2 },
        { data: bMeasuresV1[i] || [], clef: "bass", voiceNum: 1 },
        { data: bMeasuresV2[i] || [], clef: "bass", voiceNum: 2 },
      ];

      const voiceObjects: any[] = [];
      const beamsToDraw: any[] = [];

      // Procesamos cada capa (Voz 1 y Voz 2 en Sol y Fa)
      measureData.forEach((capa) => {
        if (capa.data.length === 0) return;

        const vexNotesArray: any[] = [];

        const vexNotes = capa.data.map((note: any) => {
          const durString = note.isDotted ? note.duration + "d" : note.duration;

          // 🔥 DIRECCIÓN DE LA PLICA: Voz 1 hacia arriba (1), Voz 2 hacia abajo (-1)
          const stem_direction = capa.voiceNum === 2 ? -1 : 1;

          const vNote = new StaveNote({
            clef: capa.clef,
            keys: note.keys,
            duration: durString,
            stemDirection: stem_direction,
          });

          // Estilo de selección
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

          // Alteraciones (Sostenidos, Bemoles)
          note.keys.forEach((keyName: string, index: number) => {
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          // Articulaciones
          if (note.articulation && note.articulation !== "none") {
            const pos = capa.voiceNum === 2 ? 4 : 3; // Voz 1 dibuja arriba, Voz 2 dibuja abajo
            vNote.addModifier(
              new Articulation(note.articulation).setPosition(pos),
              0,
            );
          }

          if (note.isDotted) vNote.addModifier(new Dot(), 0);

          const noteDataToSave = {
            vNote,
            tieNext: note.tieNext,
            originalIndex: note.originalIndex,
          };
          vexNotesArray.push(noteDataToSave);
          allNotesForDOM.push(noteDataToSave);

          if (capa.voiceNum === 1) allTiesV1.push(noteDataToSave);
          if (capa.voiceNum === 2) allTiesV2.push(noteDataToSave);

          return vNote;
        });

        const voice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        voice.addTickables(vexNotes);
        voiceObjects.push({ voice, clef: capa.clef });

        // Barras (Beaming) automáticas
        const beamConfig = {
          groups: Beam.getDefaultBeamGroups(safeSignature.trim()),
          beam_rests: true,
          beam_middle_only: true,
        };
        beamsToDraw.push(...Beam.generateBeams(vexNotes, beamConfig));
      });

      const formatter = new Formatter();
      let minNoteWidth = 40;

      const rawVoices = voiceObjects.map((v) => v.voice);
      if (rawVoices.length > 0) {
        formatter.joinVoices(rawVoices); // 🔥 UNE TODAS LAS VOCES PARA ALINEARLAS PERFECTAMENTE
        minNoteWidth = formatter.preCalculateMinTotalWidth
          ? formatter.preCalculateMinTotalWidth(rawVoices)
          : 100;
      }

      // Ancho dinámico basado en cuántas notas hay en el compás con más notas
      const maxNotesInMeasure = Math.max(
        ...measureData.map((c) => c.data.length),
      );
      const breathingRoom = maxNotesInMeasure * 25 + 30;
      const finalNoteWidth = minNoteWidth + breathingRoom;

      let isFirstInLine = currentX === 20;
      let padding = isFirstInLine ? 140 : 50;
      let measureWidth = finalNoteWidth + padding;

      // Salto de línea
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

      // Dibujar notas y barras
      if (rawVoices.length > 0) {
        formatter.format(rawVoices, measureWidth - padding);
        voiceObjects.forEach((vObj) => {
          if (vObj.clef === "treble") vObj.voice.draw(context, trebleStave);
          if (vObj.clef === "bass") vObj.voice.draw(context, bassStave);
        });
        beamsToDraw.forEach((b) => b.setContext(context).draw());
      }

      currentX += measureWidth;
    } // FIN DEL BUCLE FOR

    // Dibujar ligaduras
    const drawTies = (array: any[]) => {
      for (let i = 0; i < array.length - 1; i++) {
        if (array[i].tieNext && array[i + 1]) {
          const keysCount = array[i].vNote.getKeys().length;
          const indices = Array.from({ length: keysCount }, (_, idx) => idx);
          new StaveTie({
            firstNote: array[i].vNote,
            lastNote: array[i + 1].vNote,
            firstIndices: indices,
            lastIndices: indices,
          } as any)
            .setContext(context)
            .draw();
        }
      }
    };
    drawTies(allTiesV1);
    drawTies(allTiesV2);

    renderer.resize(MAX_LINE_WIDTH + 50, numLines * lineHeight + 50);

    // Inyectar IDs para hacer las notas clickeables
    allNotesForDOM.forEach((item) => {
      const svgElement = item.vNote.getSVGElement();
      if (svgElement) {
        svgElement.setAttribute("id", "note-" + item.originalIndex);
        svgElement.classList.add("clickable-note");

        if (item.vNote.note_heads && item.vNote.note_heads.length > 0) {
          item.vNote.note_heads.forEach((noteHead: any, headIndex: number) => {
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
          });
        }
      }
    });
  }, [
    notesList,
    timeSignature,
    keySignature,
    selectedNoteIndex,
    selectedKeyIndex,
  ]);

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
