import { createScale, type ViewBox } from "./ecgScale";
import type { Sample } from "../signal/signalModel";

/**
 * Dibuja la señal ECG y los ejes sobre el lienzo base (FR-003, AC-04).
 * Solo recorre las muestras dentro del rango temporal de `view.tRange`, evitando
 * redibujar toda la serie (Principio V — rendimiento).
 */
export function drawSignal(
  ctx: CanvasRenderingContext2D,
  samples: readonly Sample[],
  view: ViewBox
): void {
  const scale = createScale(view);
  const [t0, t1] = view.tRange;

  ctx.clearRect(0, 0, view.width, view.height);

  // Eje base (tiempo).
  ctx.save();
  ctx.strokeStyle = "rgba(90,90,90,0.9)";
  ctx.lineWidth = 1;
  const yZero = scale.yOf(0);
  ctx.beginPath();
  ctx.moveTo(view.padding, yZero);
  ctx.lineTo(view.width - view.padding, yZero);
  ctx.stroke();
  ctx.restore();

  // Trazo de la señal.
  ctx.save();
  ctx.strokeStyle = "#1565c0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  for (const s of samples) {
    if (s.t < t0 || s.t > t1) continue;
    const x = scale.xOf(s.t);
    const y = scale.yOf(s.v);
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

/** Calcula el rango de amplitud [min,max] con un pequeño margen, para el eje Y. */
export function amplitudeRange(samples: readonly Sample[]): [number, number] {
  if (samples.length === 0) return [-1, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
  }
  if (min === max) {
    return [min - 1, max + 1];
  }
  const margin = (max - min) * 0.1;
  return [min - margin, max + margin];
}
