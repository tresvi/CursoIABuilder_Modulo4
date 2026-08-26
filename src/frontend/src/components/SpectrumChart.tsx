import { useEffect, useMemo, useRef, useState } from "react";
import type { SpectrumPoint } from "../api/spectrumApi";
import type { ViewBox } from "../render/ecgScale";
import { drawSpectrum, powerRange } from "../render/drawSpectrum";

interface Props {
  points: SpectrumPoint[];
  width?: number;
  height?: number;
}

/**
 * Gráfico del espectro de potencia (feature 004, research.md D3): un único canvas
 * que se redibuja al cambiar los puntos, SIN capa overlay ni manejadores de puntero —
 * a diferencia de `ECGChart`, acá ninguna herramienta de interacción aplica (FR-007),
 * así que no hace falta ese aparato.
 */
export function SpectrumChart({
  points,
  width: widthProp = 900,
  height = 360,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const chartHeight = Math.max(height, measured?.h ?? height);
  const view: ViewBox = useMemo(() => {
    const maxFreq = points.length > 0 ? points[points.length - 1].frequency : 1;
    return {
      width,
      height: chartHeight,
      padding: 10,
      padLeft: 52,
      padBottom: 34,
      tRange: [0, maxFreq || 1],
      vRange: powerRange(points),
    };
  }, [points, width, chartHeight]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, chartHeight);
    drawSpectrum(ctx, points, view);
  }, [points, view, width, chartHeight]);

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
      data-testid="spectrum-chart"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={chartHeight}
        style={{ position: "absolute", inset: 0, background: "#fff" }}
        aria-label="Espectro de potencia de la señal ECG"
      />
    </div>
  );
}
