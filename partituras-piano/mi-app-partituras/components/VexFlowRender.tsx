// --- src/components/VexFlowRenderer.tsx ---
"use client";
import { useEffect, useRef, useState } from "react";
import type { VexFlowRendererProps } from "./vexflow/types";
import { renderVexFlowScore } from "./vexflow/renderScore";

export default function VexFlowRenderer({
  notesList,
  timeSignature,
  keySignature,
  selectedNoteIndex = null,
  selectedKeyIndex = null,
  onNoteClick = () => {},
}: VexFlowRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Guardamos el ancho dinámico, empezamos con 800 por defecto
  const [canvasWidth, setCanvasWidth] = useState(800);

  // 🔥 SOLUCIÓN 1: El Radar (ResizeObserver)
  // En lugar de medir toda la pantalla, esto mide EXACTAMENTE la caja blanca donde está la partitura.
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Tomamos el ancho real de la caja y le quitamos 20px de margen de seguridad
        const newWidth = entry.contentRect.width - 20;
        // Si el usuario está en móvil, nunca bajamos de 500px para que no se aplaste
        setCanvasWidth(Math.max(newWidth, 500));
      }
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    renderVexFlowScore({
      container: containerRef.current,
      notesList,
      timeSignature,
      keySignature,
      selectedNoteIndex,
      selectedKeyIndex,
      canvasWidth,
    });
  }, [
    notesList,
    timeSignature,
    keySignature,
    selectedNoteIndex,
    selectedKeyIndex,
    canvasWidth,
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
