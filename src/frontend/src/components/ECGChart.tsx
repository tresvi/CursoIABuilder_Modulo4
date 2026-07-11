import { useEffect, useRef } from "react";
import type { Signal } from "../signal/signalModel";
import type { VisibleWindow } from "../hooks/useVisibleWindow";
import type { ViewBox } from "../render/ecgScale";
import { drawSignal, amplitudeRange } from "../render/drawSignal";
import { drawGrid } from "../render/drawGrid";

interface Props {
  signal: Signal | null;
  window: VisibleWindow;
  showGrid: boolean;
  width?: number;
  height?: number;
}

/**
 * Gráfico ECG con canvas de doble capa (research.md D1, Principio V):
 * - lienzo base: rejilla + señal + ejes
 * - lienzo overlay: reservado para la interacción del mouse (US3/US5/US6)
 */
export function ECGChart({
  signal,
  window,
  showGrid,
  width = 900,
  height = 360,
}: Props) {
  const baseRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      // Entorno sin soporte de canvas (p. ej. jsdom en tests): no se dibuja.
      return;
    }
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!signal || signal.samples.length === 0) return;

    const vRange = amplitudeRange(signal.samples);
    const view: ViewBox = {
      width,
      height,
      padding: 12,
      tRange: [window.fromTime, window.toTime],
      vRange,
    };

    if (showGrid) drawGrid(ctx, view);
    drawSignal(ctx, signal.samples, view);
  }, [signal, window, showGrid, width, height]);

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
      {/* Overlay de interacción (US3+): se activa en historias posteriores */}
      <canvas
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
        data-testid="ecg-overlay"
      />
    </div>
  );
}
