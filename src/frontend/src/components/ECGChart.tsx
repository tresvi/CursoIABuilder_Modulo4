import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Signal } from "../signal/signalModel";
import type { CropRange } from "../signal/signalModel";
import type { EventMarker } from "../signal/markers";
import type { VisibleWindow } from "../hooks/useVisibleWindow";
import type { Tool } from "../hooks/useTool";
import { createScale, plotRect, type ViewBox } from "../render/ecgScale";
import { drawSignal, amplitudeRange } from "../render/drawSignal";
import { drawGrid, type PaperSpeed } from "../render/drawGrid";
import { drawAxes } from "../render/drawAxes";
import { drawMarkers } from "../render/drawMarkers";
import { selectionToRange } from "../render/selectionToRange";
import { measureRuler } from "../metrics/ruler";

interface Props {
  signal: Signal | null;
  window: VisibleWindow;
  showGrid: boolean;
  paperSpeed: PaperSpeed;
  tool: Tool;
  cursor: string;
  markers: EventMarker[];
  onZoom: (range: VisibleWindow) => void;
  onCropSelect: (range: CropRange) => void;
  onAddMarker: (time: number) => void;
  width?: number;
  height?: number;
}

interface DragState {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Gráfico ECG con canvas de doble capa (research.md D1, Principio V):
 * - lienzo base: rejilla + señal + ejes (se redibuja solo al cambiar datos/ventana)
 * - lienzo overlay: marcadores persistentes + feedback de mouse en vivo (zoom/regla/recorte)
 */
export function ECGChart({
  signal,
  window,
  showGrid,
  paperSpeed,
  tool,
  cursor,
  markers,
  onZoom,
  onCropSelect,
  onAddMarker,
  width = 900,
  height = 360,
}: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const view: ViewBox | null = useMemo(() => {
    if (!signal || signal.samples.length === 0) return null;
    return {
      width,
      height,
      // márgenes asimétricos: lugar a la izquierda (rótulos mV) y abajo (rótulos s)
      padding: 10,
      padLeft: 46,
      padBottom: 30,
      tRange: [window.fromTime, window.toTime],
      vRange: amplitudeRange(signal.samples),
    };
  }, [signal, window, width, height]);

  // Capa base: rejilla + señal + ejes con su escala.
  useEffect(() => {
    const ctx = getCtx(baseRef.current);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!signal || !view) return;
    if (showGrid) drawGrid(ctx, view, paperSpeed);
    drawSignal(ctx, signal.samples, view);
    drawAxes(ctx, view);
  }, [signal, view, showGrid, paperSpeed, width, height]);

  // Capa overlay: marcadores persistentes (+ feedback de arrastre si lo hay).
  const paintOverlay = useCallback(
    (drag: DragState | null) => {
      const ctx = getCtx(overlayRef.current);
      if (!ctx || !view) return;
      ctx.clearRect(0, 0, width, height);
      drawMarkers(ctx, markers, view);
      if (!drag) return;

      if (tool === "zoom" || tool === "crop") {
        // banda vertical que abarca todo el eje Y del área de trazado (AC-08/AC-12).
        const { y0, y1 } = plotRect(view);
        ctx.save();
        ctx.fillStyle =
          tool === "crop" ? "rgba(76,175,80,0.18)" : "rgba(21,101,192,0.18)";
        ctx.strokeStyle =
          tool === "crop" ? "rgba(76,175,80,0.9)" : "rgba(21,101,192,0.9)";
        const x = Math.min(drag.x0, drag.x1);
        const w = Math.abs(drag.x1 - drag.x0);
        ctx.fillRect(x, y0, w, y1 - y0);
        ctx.strokeRect(x, y0, w, y1 - y0);
        ctx.restore();
      } else if (tool === "ruler") {
        const m = measureRuler(drag.x0, drag.y0, drag.x1, drag.y1, view);
        ctx.save();
        ctx.strokeStyle = "#6a1b9a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(drag.x0, drag.y0);
        ctx.lineTo(drag.x1, drag.y1);
        ctx.stroke();
        ctx.fillStyle = "#6a1b9a";
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillText(
          `Δt=${m.dt.toFixed(3)} s  Δamp=${m.dAmp.toFixed(3)} mV`,
          drag.x1 + 6,
          drag.y1 - 6
        );
        ctx.restore();
      }
    },
    [markers, view, tool, width, height]
  );

  useEffect(() => {
    paintOverlay(dragRef.current);
  }, [paintOverlay]);

  function localXY(e: React.PointerEvent): { x: number; y: number } {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDown(e: React.PointerEvent) {
    if (!view || tool === "none") return;
    const { x, y } = localXY(e);
    if (tool === "marker") return; // el marcador se crea en el click (up)
    dragRef.current = { x0: x, y0: y, x1: x, y1: y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handleMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { x, y } = localXY(e);
    dragRef.current = { ...dragRef.current, x1: x, y1: y };
    paintOverlay(dragRef.current);
  }

  function handleUp(e: React.PointerEvent) {
    if (!view) return;
    const { x } = localXY(e);

    if (tool === "marker") {
      const scale = createScale(view);
      onAddMarker(scale.timeOf(x));
      return;
    }

    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (tool === "zoom") {
      const range = selectionToRange(drag.x0, drag.x1, view);
      if (range) onZoom(range);
    } else if (tool === "crop") {
      const range = selectionToRange(drag.x0, drag.x1, view);
      if (range) onCropSelect(range);
    }
    // ruler: la medición desaparece al soltar (AC-11)
    paintOverlay(null);
  }

  return (
    <div
      className="ecg-chart"
      style={{ position: "relative", width, height }}
      data-testid="ecg-chart"
    >
      <canvas
        ref={baseRef}
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, background: "#fff" }}
        aria-label="Gráfico de señal ECG"
      />
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, cursor, touchAction: "none" }}
        data-testid="ecg-overlay"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      />
    </div>
  );
}

function getCtx(
  canvas: HTMLCanvasElement | null
): CanvasRenderingContext2D | null {
  if (!canvas) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
