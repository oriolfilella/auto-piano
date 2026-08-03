import {
  Barline,
  Beam,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Tuplet,
  Voice,
  Accidental,
  Articulation,
  Dot,
  Annotation,
} from "vexflow";
import {
  calculateMeasures,
  getBeats,
  getDurations,
  parseTimeSignature,
} from "../../utils/musicLogic";
import type {
  MeasureLayer,
  NoteRenderInfo,
  RenderNote,
  VoiceRenderObject,
} from "./types";
import {
  attachNoteDomIds,
  drawPedals,
  drawSlurs,
  drawTies,
  normalizeVoices,
} from "./scoreHelpers";

export const renderVexFlowScore = ({
  container,
  notesList,
  timeSignature,
  keySignature,
  selectedNoteIndex,
  selectedKeyIndex,
  canvasWidth,
}: {
  container: HTMLDivElement;
  notesList: any[];
  timeSignature: string;
  keySignature: string;
  selectedNoteIndex?: number | null;
  selectedKeyIndex?: number | null;
  canvasWidth: number;
}) => {
  container.innerHTML = "";

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  const config = parseTimeSignature(timeSignature);
  const isValidSignature = /^\d+\/\d+$/.test(timeSignature);
  const safeSignature = isValidSignature ? timeSignature : "4/4";

  const MAX_LINE_WIDTH = canvasWidth;
  const lineHeight = 220;

  const notesWithIndex = notesList.map((note, index) => ({
    ...note,
    originalIndex: index,
  })) as RenderNote[];

  const trebleNotes = normalizeVoices(
    notesWithIndex.filter((note) => note.clef === "treble" || !note.clef),
  );
  const bassNotes = normalizeVoices(
    notesWithIndex.filter((note) => note.clef === "bass"),
  );

  const tNotesV1 = trebleNotes.filter((note) => note.normalizedVoice === 1);
  const tNotesV2 = trebleNotes.filter((note) => note.normalizedVoice === 2);
  const bNotesV1 = bassNotes.filter((note) => note.normalizedVoice === 1);
  const bNotesV2 = bassNotes.filter((note) => note.normalizedVoice === 2);

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

  const allNotesForDOM: NoteRenderInfo[] = [];
  const allTiesTrebleV1: NoteRenderInfo[] = [];
  const allTiesTrebleV2: NoteRenderInfo[] = [];
  const allTiesBassV1: NoteRenderInfo[] = [];
  const allTiesBassV2: NoteRenderInfo[] = [];

  for (let index = 0; index < totalMeasures; index += 1) {
    const measureData: MeasureLayer[] = [
      { data: tMeasuresV1[index] || [], clef: "treble", voiceNum: 1 },
      { data: tMeasuresV2[index] || [], clef: "treble", voiceNum: 2 },
      { data: bMeasuresV1[index] || [], clef: "bass", voiceNum: 1 },
      { data: bMeasuresV2[index] || [], clef: "bass", voiceNum: 2 },
    ];

    const voiceObjects: VoiceRenderObject[] = [];
    const beamsToDraw: any[] = [];
    const tupletsToDraw: any[] = [];

    measureData.forEach((layer) => {
      if (layer.data.length === 0) return;

      const vexNotesArray: NoteRenderInfo[] = [];
      let currentBeats = 0;
      let currentTripletGroup: any[] = [];

      const vexNotes = layer.data.map((note: RenderNote) => {
        currentBeats += getBeats(note.duration, note.isDotted, note.isTriplet);

        const durString = note.isDotted ? `${note.duration}d` : note.duration;
        const stemDirection = layer.voiceNum === 2 ? -1 : 1;

        let vNote;

        if (note.isInvisible) {
          vNote = new GhostNote({ duration: durString.replace("r", "") });
          vexNotesArray.push({
            vNote,
            manualTie: false,
            originalIndex: note.originalIndex ?? -1,
          });
          return vNote;
        }

        vNote = new StaveNote({
          clef: layer.clef,
          keys: note.keys,
          duration: durString,
          stemDirection,
        });

        const resolvedSelectedKeyIndex = selectedKeyIndex ?? -1;

        if (note.originalIndex === selectedNoteIndex) {
          if (resolvedSelectedKeyIndex !== -1) {
            vNote.setKeyStyle(resolvedSelectedKeyIndex, {
              fillStyle: "#3b82f6",
              strokeStyle: "#3b82f6",
            });
          } else {
            vNote.setStyle({ fillStyle: "#3b82f6", strokeStyle: "#3b82f6" });
          }
        }

        note.keys.forEach((keyName: string, keyIndex: number) => {
          const symbol = keyName.split("/")[0].slice(1);
          if (symbol === "#" || symbol === "b" || symbol === "n") {
            vNote.addModifier(new Accidental(symbol), keyIndex);
          }
        });

        if (note.articulation && note.articulation !== "none") {
          const pos = layer.voiceNum === 2 ? 4 : 3;
          vNote.addModifier(
            new Articulation(note.articulation).setPosition(pos),
            0,
          );
        }

        if (note.isDotted) {
          vNote.addModifier(new Dot(), 0);
        }

        if (note.textAnnotation) {
          vNote.addModifier(
            new Annotation(note.textAnnotation)
              .setFont("Arial", 11, "bold")
              .setVerticalJustification(Annotation.VerticalJustify.TOP),
            0,
          );
        }

        if (note.dynamic && note.dynamic !== "none") {
          vNote.addModifier(
            new Annotation(note.dynamic)
              .setFont("Times New Roman", 14, "bold italic")
              .setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
            0,
          );
        }

        const noteOriginalIndex = note.originalIndex ?? -1;
        const noteDataToSave: NoteRenderInfo = {
          vNote,
          manualTie: Boolean(note.manualTie),
          originalIndex: noteOriginalIndex,
        };

        vexNotesArray.push(noteDataToSave);
        allNotesForDOM.push(noteDataToSave);

        if (layer.clef === "treble" && layer.voiceNum === 1) {
          allTiesTrebleV1.push(noteDataToSave);
        }
        if (layer.clef === "treble" && layer.voiceNum === 2) {
          allTiesTrebleV2.push(noteDataToSave);
        }
        if (layer.clef === "bass" && layer.voiceNum === 1) {
          allTiesBassV1.push(noteDataToSave);
        }
        if (layer.clef === "bass" && layer.voiceNum === 2) {
          allTiesBassV2.push(noteDataToSave);
        }

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
        chunks.forEach((duration) => {
          tickables.push(new GhostNote({ duration }));
        });
      }

      const voice = new Voice({
        numBeats: config.numBeats,
        beatValue: config.beatValue,
      }).setStrict(false);
      voice.addTickables(tickables);
      voiceObjects.push({ voice, clef: layer.clef });

      const beamConfig = {
        groups: Beam.getDefaultBeamGroups(safeSignature.trim()),
        beam_rests: true,
        beam_middle_only: true,
      };
      beamsToDraw.push(...Beam.generateBeams(vexNotes, beamConfig));
    });

    const formatter = new Formatter();
    let minNoteWidth = 40;

    const rawVoices = voiceObjects.map((voiceObject) => voiceObject.voice);
    if (rawVoices.length > 0) {
      formatter.joinVoices(rawVoices);
      minNoteWidth = formatter.preCalculateMinTotalWidth
        ? formatter.preCalculateMinTotalWidth(rawVoices)
        : 100;
    }

    const maxNotesInMeasure = Math.max(
      ...measureData.map((layer) => layer.data.length),
    );
    const breathingRoom = maxNotesInMeasure * 15 + 20;
    const finalNoteWidth = minNoteWidth + breathingRoom;

    let isFirstInLine = currentX === 20;
    let padding = isFirstInLine ? 140 : 50;
    let measureWidth = finalNoteWidth + padding;

    if (currentX + measureWidth > MAX_LINE_WIDTH && !isFirstInLine) {
      currentX = 20;
      currentY += lineHeight;
      numLines += 1;
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
    measureData.forEach((layer) => {
      if (layer.data.some((note) => note.hasEndRepeat)) {
        isRepeatEnd = true;
      }
    });

    if (index === totalMeasures - 1) {
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
      voiceObjects.forEach((voiceObject) => {
        if (voiceObject.clef === "treble") {
          voiceObject.voice.draw(context, trebleStave);
        }
        if (voiceObject.clef === "bass") {
          voiceObject.voice.draw(context, bassStave);
        }
      });
      beamsToDraw.forEach((beam) => beam.setContext(context).draw());
      tupletsToDraw.forEach((tuplet) => tuplet.setContext(context).draw());
    }

    currentX += measureWidth;
  }

  drawTies(allTiesTrebleV1, context);
  drawTies(allTiesTrebleV2, context);
  drawTies(allTiesBassV1, context);
  drawTies(allTiesBassV2, context);
  drawPedals(allNotesForDOM, notesList, context);
  drawSlurs(allNotesForDOM, notesList, context);

  renderer.resize(MAX_LINE_WIDTH + 50, numLines * lineHeight + 50);
  attachNoteDomIds(allNotesForDOM);
};
