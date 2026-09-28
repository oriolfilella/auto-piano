// hooks/useScore.ts
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/superbaseClient";
import { NoteData } from "../utils/musicLogic";
import { parseMusicXML } from "../utils/musicXMLParser";

export function useScore(session: Session | null) {
  const [notesList, setNotesList] = useState<NoteData[]>([]);
  const [title, setTitle] = useState<string>("");
  const [timeSignature, setTimeSignature] = useState<string>("4/4");
  const [keySignature, setKeySignature] = useState<string>("C");
  const [savedScores, setSavedScores] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);

  const fetchScores = async (userId: string) => {
    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setSavedScores(data || []);
  };

  useEffect(() => {
    if (session?.user.id) {
      fetchScores(session.user.id);
    } else {
      setSavedScores([]);
    }
  }, [session]);

  const handleLoadScore = (scoreId: string) => {
    const score = savedScores.find((s) => s.id.toString() === scoreId);
    if (score) {
      setNotesList(score.content || []);
      setTitle(score.title || "");
      setTimeSignature(score.time_signature || "4/4");
      setKeySignature(score.key_signature || "C");
      setSelectedNoteIndex(null);
    }
  };

  const saveScore = async () => {
    if (!session?.user.id) {
      return alert(
        "🔒 Para guardar tus partituras en la nube y acceder a ellas desde cualquier lugar, por favor inicia sesión o crea una cuenta gratis.",
      );
    }
    if (!title) return alert("⚠️ Ponle un título.");

    setIsSaving(true);
    const { error } = await supabase.from("scores").insert([
      {
        title,
        content: notesList,
        time_signature: timeSignature,
        key_signature: keySignature,
        user_id: session.user.id,
      },
    ]);
    if (!error) {
      alert("✅ ¡Guardado con éxito!");
      if(session?.user.id) fetchScores(session.user.id);
    } else {
      console.error("Error guardando:", error);
      alert("❌ Hubo un error al guardar.");
    }
    setIsSaving(false);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlText = e.target?.result as string;
      try {
        const parsedNotes = parseMusicXML(xmlText);
        setNotesList(parsedNotes);
        setTitle(file.name.replace(".musicxml", ""));
        alert("✅ Partitura cargada con éxito.");
      } catch (error) {
        console.error(error);
        alert("❌ Error al leer el archivo MusicXML.");
      }
    };
    reader.readAsText(file);
  };

  return {
    notesList,
    setNotesList,
    title,
    setTitle,
    timeSignature,
    setTimeSignature,
    keySignature,
    setKeySignature,
    savedScores,
    isSaving,
    handleLoadScore,
    saveScore,
    handleFileUpload,
    selectedNoteIndex,
    setSelectedNoteIndex,
  };
}
