// hooks/useAudioPlayback.ts
import { useState } from 'react';
import { NoteData } from '../utils/musicLogic';
import { playAudioPC, stopAudioPC } from '../utils/audioPlayer';

interface UseAudioPlaybackProps {
    notesList: NoteData[];
    bpm: number;
    keySignature: string;
}

export function useAudioPlayback({ notesList, bpm, keySignature }: UseAudioPlaybackProps) {
    const [isPlayingPC, setIsPlayingPC] = useState(false);

    const handlePlayPC = async () => {
        if (isPlayingPC) {
            stopAudioPC();
            setIsPlayingPC(false);
            return;
        }

        if (notesList.length === 0) {
            alert("⚠️ No hay notas para reproducir.");
            return;
        }

        setIsPlayingPC(true);
        const safeBpm = bpm > 0 ? bpm : 60;

        await playAudioPC(notesList, safeBpm, keySignature, () => {
            setIsPlayingPC(false);
        });
    };

    return {
        isPlayingPC,
        handlePlayPC,
    };
}
