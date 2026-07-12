import { createScale, plotRect, type ViewBox } from "./ecgScale";
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
  const { x0, y0, x1, y1 } = plotRect(view);

  // Nota: el lienzo lo limpia el llamador (ECGChart) antes de dibujar la grilla;
  // NO se limpia aquí para no borrar la grilla ya pintada.

  // Eje base (línea de 0 mV), dentro del área de trazado.
  const yZero = scale.yOf(0);
  if (yZero >= y0 && yZero <= y1) {
    ctx.save();
    ctx.strokeStyle = "rgba(90,90,90,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, yZero);
    ctx.lineTo(x1, yZero);
    ctx.stroke();
    ctx.restore();
  }

  // Trazo de la señal, recortado al área de trazado para no invadir los rótulos.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
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
