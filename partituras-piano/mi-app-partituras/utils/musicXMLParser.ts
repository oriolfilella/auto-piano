// src/utils/musicXMLParser.ts
import { NoteData } from "./musicLogic";

export const parseMusicXML = (xmlText: string): NoteData[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const notesWithTiming: { beat: number; note: NoteData }[] = [];

  const typeToDuration: Record<string, string> = {
    whole: "w",
    half: "h",
    quarter: "q",
    eighth: "8",
    "16th": "16",
    "32nd": "32",
  };

  const measures = xmlDoc.getElementsByTagName("measure");
  let currentGlobalBeat = 0;

  for (let i = 0; i < measures.length; i++) {
    const measure = measures[i];
    const elements = measure.children;
    let measureCursor = currentGlobalBeat;
    let measureDuration = 0;

    const divisionsNode = xmlDoc.getElementsByTagName("divisions")[0];
    const divisions = divisionsNode
      ? parseInt(divisionsNode.textContent || "1")
      : 1;

    for (let j = 0; j < elements.length; j++) {
      const el = elements[j];

      if (el.tagName === "backup") {
        const duration = parseInt(
          el.getElementsByTagName("duration")[0]?.textContent || "0",
        );
        measureCursor -= duration / divisions;
      }
      if (el.tagName === "forward") {
        const duration = parseInt(
          el.getElementsByTagName("duration")[0]?.textContent || "0",
        );
        measureCursor += duration / divisions;
      }

      if (el.tagName === "note") {
        const isRest = el.getElementsByTagName("rest").length > 0;
        const isChord = el.getElementsByTagName("chord").length > 0;

        const staffNode = el.getElementsByTagName("staff")[0];
        const currentClef: "treble" | "bass" =
          staffNode && staffNode.textContent === "2" ? "bass" : "treble";

        const typeNode = el.getElementsByTagName("type")[0];
        const durationStr =
          typeToDuration[typeNode?.textContent || "quarter"] || "q";
        const durationTicks = parseInt(
          el.getElementsByTagName("duration")[0]?.textContent || "0",
        );
        const noteBeats = durationTicks / divisions;

        let keyToUse = currentClef === "treble" ? "b/4" : "d/3";
        if (!isRest) {
          const pitch = el.getElementsByTagName("pitch")[0];
          if (pitch) {
            const step =
              pitch
                .getElementsByTagName("step")[0]
                ?.textContent?.toLowerCase() || "c";
            const alter = pitch.getElementsByTagName("alter")[0]?.textContent;
            const octave =
              pitch.getElementsByTagName("octave")[0]?.textContent || "4";
            let accidental = alter === "1" ? "#" : alter === "-1" ? "b" : "";
            keyToUse = `${step}${accidental}/${octave}`;
          }
        }

        // --- 🔥 DETECCIÓN DE LIGADURAS (TIES Y SLURS) ---
        let isTieStart = false;
        let slurStatus: "start" | "stop" | undefined = undefined;

        const notations = el.getElementsByTagName("notations")[0];
        if (notations) {
          // 1. Ligadura de Prolongación (Tie)
          const ties = notations.getElementsByTagName("tie");
          for (let k = 0; k < ties.length; k++) {
            if (ties[k].getAttribute("type") === "start") isTieStart = true;
          }

          // 2. Ligadura de Expresión (Slur)
          const slurs = notations.getElementsByTagName("slur");
          for (let k = 0; k < slurs.length; k++) {
            const sType = slurs[k].getAttribute("type");
            if (sType === "start" || sType === "stop")
              slurStatus = sType as "start" | "stop";
          }
        }

        if (isChord && notesWithTiming.length > 0 && !isRest) {
          const lastEntry = notesWithTiming[notesWithTiming.length - 1];
          if (!lastEntry.note.keys.includes(keyToUse)) {
            lastEntry.note.keys.push(keyToUse);
            lastEntry.note.keys.sort();
          }
        } else {
          const newNote: NoteData = {
            keys: [keyToUse],
            duration: isRest ? durationStr + "r" : durationStr,
            clef: currentClef,
            voice: parseInt(
              el.getElementsByTagName("voice")[0]?.textContent || "1",
            ),
            isDotted: el.getElementsByTagName("dot").length > 0,
            isTriplet: el.getElementsByTagName("time-modification").length > 0,
            manualTie: isTieStart, // Se lo asignamos a la nota
            slur: slurStatus, // Se lo asignamos a la nota
          };

          notesWithTiming.push({ beat: measureCursor, note: newNote });
          measureCursor += noteBeats;
          if (measureCursor - currentGlobalBeat > measureDuration) {
            measureDuration = measureCursor - currentGlobalBeat;
          }
        }
      }
    }
    currentGlobalBeat += measureDuration;
  }

  notesWithTiming.sort((a, b) => a.beat - b.beat);
  return notesWithTiming.map((entry) => entry.note);
};
