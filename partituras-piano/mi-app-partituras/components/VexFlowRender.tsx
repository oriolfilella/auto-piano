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
  GhostNote,
  Barline,
  Tuplet,
  Annotation,
  PedalMarking,
  Curve,
} from "vexflow";
import {
  NoteData,
  calculateMeasures,
  parseTimeSignature,
  getBeats,
  getDurations,
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

    // Normalizador de Voces
    const normalizeVoices = (notes: any[]) => {
      const uniqueVoices = Array.from(
        new Set(notes.map((n) => n.voice || 1)),
      ).sort((a, b) => a - b);
      return notes.map((n) => ({
        ...n,
        normalizedVoice: uniqueVoices.indexOf(n.voice || 1) + 1,
      }));
    };

    const trebleNotes = normalizeVoices(
      notesWithIndex.filter((n) => n.clef === "treble" || !n.clef),
    );
    const bassNotes = normalizeVoices(
      notesWithIndex.filter((n) => n.clef === "bass"),
    );

    const tNotesV1 = trebleNotes.filter((n) => n.normalizedVoice === 1);
    const tNotesV2 = trebleNotes.filter((n) => n.normalizedVoice === 2);
    const bNotesV1 = bassNotes.filter((n) => n.normalizedVoice === 1);
    const bNotesV2 = bassNotes.filter((n) => n.normalizedVoice === 2);

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

    const allNotesForDOM: any[] = [];
    const allTiesTrebleV1: any[] = [];
    const allTiesTrebleV2: any[] = [];
    const allTiesBassV1: any[] = [];
    const allTiesBassV2: any[] = [];

    for (let i = 0; i < totalMeasures; i++) {
      const measureData = [
        { data: tMeasuresV1[i] || [], clef: "treble", voiceNum: 1 },
        { data: tMeasuresV2[i] || [], clef: "treble", voiceNum: 2 },
        { data: bMeasuresV1[i] || [], clef: "bass", voiceNum: 1 },
        { data: bMeasuresV2[i] || [], clef: "bass", voiceNum: 2 },
      ];

      const voiceObjects: any[] = [];
      const beamsToDraw: any[] = [];
      const tupletsToDraw: any[] = [];

      measureData.forEach((capa) => {
        if (capa.data.length === 0) return;

        const vexNotesArray: any[] = [];
        let currentBeats = 0;
        let currentTripletGroup: any[] = [];

        const vexNotes = capa.data.map((note: any) => {
          currentBeats += getBeats(
            note.duration,
            note.isDotted,
            note.isTriplet,
          );

          const durString = note.isDotted ? note.duration + "d" : note.duration;
          const stem_direction = capa.voiceNum === 2 ? -1 : 1;

          let vNote;

          if (note.isInvisible) {
            vNote = new GhostNote({ duration: durString.replace("r", "") });
            vexNotesArray.push({
              vNote,
              manualTie: false,
              originalIndex: note.originalIndex,
            });
            return vNote;
          }

          vNote = new StaveNote({
            clef: capa.clef,
            keys: note.keys,
            duration: durString,
            stemDirection: stem_direction,
          });

          // 1. Estilos
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

          // 2. Alteraciones
          note.keys.forEach((keyName: string, index: number) => {
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b" || symbol === "n") {
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          // 3. Articulaciones
          if (note.articulation && note.articulation !== "none") {
            const pos = capa.voiceNum === 2 ? 4 : 3;
            vNote.addModifier(
              new Articulation(note.articulation).setPosition(pos),
              0,
            );
          }

          // 4. Puntillo
          if (note.isDotted) vNote.addModifier(new Dot(), 0);

          // 5. Texto Libre
          if (note.textAnnotation) {
            vNote.addModifier(
              new Annotation(note.textAnnotation)
                .setFont("Arial", 11, "bold")
                .setVerticalJustification(Annotation.VerticalJustify.TOP),
              0,
            );
          }

          // 6. Dinámicas
          if (note.dynamic && note.dynamic !== "none") {
            vNote.addModifier(
              new Annotation(note.dynamic)
                .setFont("Times New Roman", 14, "bold italic")
                .setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
              0,
            );
          }

          const noteDataToSave = {
            vNote,
            manualTie: note.manualTie,
            originalIndex: note.originalIndex,
          };
          vexNotesArray.push(noteDataToSave);
          allNotesForDOM.push(noteDataToSave);

          // Asignación de carriles para ligaduras
          if (capa.clef === "treble" && capa.voiceNum === 1)
            allTiesTrebleV1.push(noteDataToSave);
          if (capa.clef === "treble" && capa.voiceNum === 2)
            allTiesTrebleV2.push(noteDataToSave);
          if (capa.clef === "bass" && capa.voiceNum === 1)
            allTiesBassV1.push(noteDataToSave);
          if (capa.clef === "bass" && capa.voiceNum === 2)
            allTiesBassV2.push(noteDataToSave);

          if (note.isTriplet && !note.isInvisible) {
            currentTripletGroup.push(vNote);
            if (currentTripletGroup.length === 3) {
              tupletsToDraw.push(new Tuplet(currentTripletGroup));
              currentTripletGroup = [];
            }
          } else {
            currentTripletGroup = [];
          }

          return vNote;
        });

        const tickables: any[] = [...vexNotes];
        const spaceLeft =
          Math.round((config.capacity - currentBeats) * 1000) / 1000;

        if (spaceLeft > 0) {
          const chunks = getDurations(spaceLeft);
          chunks.forEach((dur) => {
            tickables.push(new GhostNote({ duration: dur }));
          });
        }

        const voice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        voice.addTickables(tickables);
        voiceObjects.push({ voice, clef: capa.clef });

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
        formatter.joinVoices(rawVoices);
        minNoteWidth = formatter.preCalculateMinTotalWidth
          ? formatter.preCalculateMinTotalWidth(rawVoices)
          : 100;
      }

      const maxNotesInMeasure = Math.max(
        ...measureData.map((c) => c.data.length),
      );
      const breathingRoom = maxNotesInMeasure * 25 + 30;
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

      let isRepeatEnd = false;
      measureData.forEach((capa) => {
        if (capa.data.some((n: any) => n.hasEndRepeat)) {
          isRepeatEnd = true;
        }
      });

      if (i === totalMeasures - 1) {
        trebleStave.setEndBarType(
          isRepeatEnd ? Barline.type.REPEAT_END : Barline.type.END,
        );
        bassStave.setEndBarType(
          isRepeatEnd ? Barline.type.REPEAT_END : Barline.type.END,
        );
      } else if (isRepeatEnd) {
        trebleStave.setEndBarType(Barline.type.REPEAT_END);
        bassStave.setEndBarType(Barline.type.REPEAT_END);
      }

      trebleStave.setContext(context).draw();
      bassStave.setContext(context).draw();

      if (rawVoices.length > 0) {
        formatter.format(rawVoices, measureWidth - padding);
        voiceObjects.forEach((vObj) => {
          if (vObj.clef === "treble") vObj.voice.draw(context, trebleStave);
          if (vObj.clef === "bass") vObj.voice.draw(context, bassStave);
        });
        beamsToDraw.forEach((b) => b.setContext(context).draw());
        tupletsToDraw.forEach((t) => t.setContext(context).draw());
      }

      currentX += measureWidth;
    }

    // 🔥 CORRECCIÓN APLICADA: Uso de firstNote/lastNote en vez de first_note/last_note con try/catch de seguridad
    const drawTies = (array: any[]) => {
      for (let i = 0; i < array.length - 1; i++) {
        if (
          array[i].manualTie &&
          array[i].vNote &&
          array[i + 1] &&
          array[i + 1].vNote
        ) {
          const keysCount = array[i].vNote.getKeys?.().length || 1;
          const indices = Array.from({ length: keysCount }, (_, idx) => idx);
          try {
            new StaveTie({
              firstNote: array[i].vNote,
              lastNote: array[i + 1].vNote,
              firstIndices: indices,
              lastIndices: indices,
            } as any)
              .setContext(context)
              .draw();
          } catch (e) {
            console.warn("No se pudo dibujar la ligadura:", e);
          }
        }
      }
    };

    drawTies(allTiesTrebleV1);
    drawTies(allTiesTrebleV2);
    drawTies(allTiesBassV1);
    drawTies(allTiesBassV2);

    const drawPedals = () => {
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
          const pedal = new PedalMarking([currentStart, item.vNote]);
          pedal.setContext(context).draw();
          currentStart = null;
        }
      });
    };
    drawPedals();

    const drawSlurs = () => {
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
            const curve = new Curve(currentSlurStart, item.vNote, {
              thickness: 2,
              xShift: 0,
              yShift: 10,
            });
            curve.setContext(context).draw();
          } catch (e) {
            console.warn("No se pudo dibujar el Slur:", e);
          }
          currentSlurStart = null;
        }
      });
    };
    drawSlurs();

    renderer.resize(MAX_LINE_WIDTH + 50, numLines * lineHeight + 50);

    allNotesForDOM.forEach((item) => {
      const svgElement = item.vNote.getSVGElement?.();
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
