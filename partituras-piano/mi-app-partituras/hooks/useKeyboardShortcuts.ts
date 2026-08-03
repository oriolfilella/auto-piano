// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface ShortcutActions {
    toggleAccidental: (acc: "#" | "b" | "n") => void;
    setIsDotActive: (value: React.SetStateAction<boolean>) => void;
    setIsTieActive: (value: React.SetStateAction<boolean>) => void;
    addRest: () => void;
    handleArticulationChange: (art: string) => void;
    undoLastNote: () => void;
    handlePlayPC: () => void;
    setCurrentDuration: (duration: string) => void;
    setIsChordMode: (value: React.SetStateAction<boolean>) => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;

            if (
                (e.target as HTMLElement).tagName === "INPUT" ||
                (e.target as HTMLElement).tagName === "SELECT"
            ) {
                return;
            }

            if (e.key === "Shift" || e.key.toLowerCase() === "a") {
                actions.setIsChordMode(true);
            }

            switch (e.key.toLowerCase()) {
                case "s": actions.toggleAccidental("#"); break;
                case "f": actions.toggleAccidental("b"); break;
                case "n": actions.toggleAccidental("n"); break;
                case "d": actions.setIsDotActive(prev => !prev); break;
                case "t": actions.setIsTieActive(prev => !prev); break;
                case "r": actions.addRest(); break;
                case ".": actions.handleArticulationChange("a."); break;
                case "-": actions.handleArticulationChange("a-"); break;
                case "v": actions.handleArticulationChange("a>"); break;
                case "m": actions.handleArticulationChange("a^"); break;
                case "x": actions.handleArticulationChange("none"); break;
                case "z":
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        actions.undoLastNote();
                    }
                    break;
                case " ":
                    e.preventDefault();
                    actions.handlePlayPC();
                    break;
                case "1": actions.setCurrentDuration("w"); break;
                case "2": actions.setCurrentDuration("h"); break;
                case "3": actions.setCurrentDuration("q"); break;
                case "4": actions.setCurrentDuration("8"); break;
                case "5": actions.setCurrentDuration("16"); break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift" || e.key.toLowerCase() === "a") {
                actions.setIsChordMode(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [actions]);
}
