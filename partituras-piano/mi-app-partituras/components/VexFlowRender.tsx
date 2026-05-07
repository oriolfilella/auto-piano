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
};

export default function VexFlowRenderer({
  notesList,
  timeSignature,
}: VexFlowRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const config = signatureConfig[timeSignature];
    const MAX_LINE_WIDTH = 900;
    const lineHeight = 220;

    const trebleMeasures = calculateMeasures(
      notesList.filter((n) => n.clef === "treble"),
      timeSignature,
    );
    const bassMeasures = calculateMeasures(
      notesList.filter((n) => n.clef === "bass"),
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
            clef: "treble", // o "bass"
            keys: note.keys, // <-- fíjate que ahora pasamos el array directamente
            duration: durString,
          });
          note.keys.forEach((keyName, index) => {
            // Extraemos el símbolo (si la nota es "c#/4", esto saca el "#")
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              // Si hay símbolo, le decimos a VexFlow que lo dibuje al lado de la nota
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          if (note.isDotted) vNote.addModifier(new Dot(), 0);
          allTrebleVexNotes.push({ vNote, tieNext: note.tieNext });
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
            clef: "bass", // <--- CORREGIDO
            keys: note.keys,
            duration: durString,
          });
          note.keys.forEach((keyName, index) => {
            // Extraemos el símbolo (si la nota es "c#/4", esto saca el "#")
            const symbol = keyName.split("/")[0].slice(1);
            if (symbol === "#" || symbol === "b") {
              // Si hay símbolo, le decimos a VexFlow que lo dibuje al lado de la nota
              vNote.addModifier(new Accidental(symbol), index);
            }
          });

          if (note.isDotted) vNote.addModifier(new Dot(), 0);
          allBassVexNotes.push({ vNote, tieNext: note.tieNext });
          return vNote;
        });
        bVoice = new Voice({
          numBeats: config.numBeats,
          beatValue: config.beatValue,
        }).setStrict(false);
        bVoice.addTickables(vexNotes);
        voices.push(bVoice);
      }

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
  }, [notesList, timeSignature]);

  return <div ref={containerRef} className="mx-auto" />;
}
