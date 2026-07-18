import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { measureRuler, rulerBox } from "../metrics/ruler";

interface Props {
  signal: Signal | null;
  window: VisibleWindow;
  showGrid: boolean;
  paperSpeed: PaperSpeed;
  tool: Tool;
  cursor: string;
  markers: EventMarker[];
  onZoom: (range: VisibleWindow) => void;
  onPan: (deltaTime: number) => void;
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
  onPan,
  onCropSelect,
  onAddMarker,
  width: widthProp = 900,
  height = 360,
}: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tamaño responsivo: el canvas ocupa el ancho y el alto del contenedor
  // (tablet/PC). `widthProp` (900) y `height` (360) son el fallback en entornos
  // sin ResizeObserver (jsdom/tests).
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(
    null
  );
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0) setMeasured({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const width = Math.max(320, measured?.w ?? widthProp);
  // El alto lo manda el contenedor (50 vh desde MainPage); `height` es el piso.
  const chartHeight = Math.max(height, measured?.h ?? height);

  const view: ViewBox | null = useMemo(() => {
    if (!signal || signal.samples.length === 0) return null;
    return {
      width,
      height: chartHeight,
      // márgenes asimétricos: lugar a la izquierda (rótulos mV) y abajo (rótulos s).
      // Acompañan al tamaño de fuente de los rótulos (13px en drawAxes).
      padding: 10,
      padLeft: 52,
      padBottom: 34,
      tRange: [window.fromTime, window.toTime],
      vRange: amplitudeRange(signal.samples),
    };
  }, [signal, window, width, chartHeight]);

  // Capa base: rejilla + señal + ejes con su escala.
  useEffect(() => {
    const ctx = getCtx(baseRef.current);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, chartHeight);
    if (!signal || !view) return;
    if (showGrid) drawGrid(ctx, view, paperSpeed);
    drawSignal(ctx, signal.samples, view);
    drawAxes(ctx, view);
  }, [signal, view, showGrid, paperSpeed, width, chartHeight]);

  // Capa overlay: marcadores persistentes (+ feedback de arrastre si lo hay).
  const paintOverlay = useCallback(
    (drag: DragState | null) => {
      const ctx = getCtx(overlayRef.current);
      if (!ctx || !view) return;
      ctx.clearRect(0, 0, width, chartHeight);
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
        const box = rulerBox(drag.x0, drag.y0, drag.x1, drag.y1);
        ctx.save();
        ctx.strokeStyle = "#6a1b9a";
        // Recuadro que circunscribe la recta (ancho = Δt, alto = Δamplitud).
        ctx.fillStyle = "rgba(106,27,154,0.10)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        // Recta del recorrido del mouse (diagonal del recuadro), sólida.
        ctx.setLineDash([]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(drag.x0, drag.y0);
        ctx.lineTo(drag.x1, drag.y1);
        ctx.stroke();
        ctx.fillStyle = "#6a1b9a";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(
          `Δt=${m.dt.toFixed(3)} s  Δamp=${m.dAmp.toFixed(3)} mV`,
          drag.x1 + 6,
          drag.y1 - 6
        );
        ctx.restore();
      }
    },
    [markers, view, tool, width, chartHeight]
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
    if (!dragRef.current || !view) return;
    const { x, y } = localXY(e);

    if (tool === "pan") {
      // Desplazamiento incremental: convierte el delta en píxeles a segundos y
      // mueve la ventana en sentido contrario al arrastre (se "agarra" la señal).
      const scale = createScale(view);
      const dt = scale.timeOf(x) - scale.timeOf(dragRef.current.x1);
      if (dt !== 0) onPan(-dt);
      dragRef.current = { ...dragRef.current, x1: x, y1: y };
      return; // el pan no dibuja banda en el overlay
    }

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

  // El alto real lo fija el contenedor padre; `height` queda como mínimo.
  return (
    <div
      ref={containerRef}
      className="ecg-chart"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: height,
      }}
      data-testid="ecg-chart"
    >
      <canvas
        ref={baseRef}
        width={width}
        height={chartHeight}
        style={{ position: "absolute", inset: 0, background: "#fff" }}
        aria-label="Gráfico de señal ECG"
      />
      <canvas
        ref={overlayRef}
        width={width}
        height={chartHeight}
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
