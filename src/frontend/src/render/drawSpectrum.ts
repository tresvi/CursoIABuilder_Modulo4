import { createScale, plotRect, type ViewBox } from "./ecgScale";
import type { SpectrumPoint } from "../api/spectrumApi";

/**
 * Dibuja el espectro de potencia (frecuencia vs. potencia) reutilizando la misma
 * escala genérica que el trazado ECG (research.md D4): `view.tRange` se usa para el
 * rango de frecuencia y `view.vRange` para el rango de potencia, sin un sistema de
 * escala paralelo.
 */
export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  points: readonly SpectrumPoint[],
  view: ViewBox
): void {
  const scale = createScale(view);
  const [f0, f1] = view.tRange;
  const { x0, y0, x1, y1 } = plotRect(view);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.strokeStyle = "#1565c0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  for (const p of points) {
    if (p.frequency < f0 || p.frequency > f1) continue;
    const x = scale.xOf(p.frequency);
    const y = scale.yOf(p.power);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Rango de potencia [0, max] con margen, para el eje Y (la potencia no es negativa). */
export function powerRange(points: readonly SpectrumPoint[]): [number, number] {
  if (points.length === 0) return [0, 1];
  let max = 0;
  for (const p of points) if (p.power > max) max = p.power;
  if (max === 0) return [0, 1];
  return [0, max * 1.1];
}
