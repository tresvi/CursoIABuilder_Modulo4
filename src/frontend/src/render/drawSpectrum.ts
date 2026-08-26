import { createScale, plotRect, type ViewBox } from "./ecgScale";
import { niceTicks, formatTick } from "./drawAxes";
import type { SpectrumPoint } from "../api/spectrumApi";

/** Dominio fijo del eje de frecuencia, a pedido del usuario. */
export const SPECTRUM_MAX_FREQ_HZ = 100;

/** Paso fijo entre divisiones del eje de frecuencia (Hz), a pedido del usuario. */
const SPECTRUM_TICK_STEP_HZ = 1;

/** Separación mínima en píxeles entre etiquetas de X para que no se amontonen
 * (mismo criterio de legibilidad que `GRID_MIN_PX` de `drawGrid.ts`). */
const MIN_LABEL_PX = 32;

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

/**
 * Menor paso (múltiplo de 1 Hz) tal que dos etiquetas consecutivas del eje X no
 * se amontonen dado el espacio disponible en píxeles por Hz.
 */
export function frequencyLabelStep(pxPerHz: number, minLabelPx = MIN_LABEL_PX): number {
  if (!(pxPerHz > 0)) return SPECTRUM_TICK_STEP_HZ;
  return Math.max(SPECTRUM_TICK_STEP_HZ, Math.ceil(minLabelPx / pxPerHz));
}

/** Formatea una frecuencia con exactamente 1 decimal ("0.0", "10.0", "49.5"). */
export function formatFrequencyTick(hz: number): string {
  return hz.toFixed(1);
}

/**
 * Dibuja los ejes del espectro: X = "Frecuencia (Hz)", dominio fijo 0–100 Hz con
 * una división cada 1 Hz (etiquetada cada `frequencyLabelStep` Hz para que no se
 * amontonen, mismo criterio que `GRID_MIN_PX` de `drawGrid.ts`); Y = "Potencia",
 * escala automática vía `niceTicks` (igual que `drawAxes.ts`).
 */
export function drawSpectrumAxes(ctx: CanvasRenderingContext2D, view: ViewBox): void {
  const scale = createScale(view);
  const { x0, y0, x1, y1 } = plotRect(view);
  const [f0, f1] = view.tRange;
  const [p0, p1] = view.vRange;

  ctx.save();
  ctx.strokeStyle = "#9e9e9e";
  ctx.fillStyle = "#333";
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui, sans-serif";

  // Líneas de los ejes.
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Eje X — frecuencia en Hz, división fija de 1 Hz; solo se etiqueta cada
  // `step` Hz para que las etiquetas no se solapen.
  const pxPerHz = Math.abs(scale.xOf(f0 + 1) - scale.xOf(f0));
  const step = frequencyLabelStep(pxPerHz);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const firstTick = Math.ceil(f0 / SPECTRUM_TICK_STEP_HZ) * SPECTRUM_TICK_STEP_HZ;
  for (let hz = firstTick; hz <= f1 + 1e-9; hz += SPECTRUM_TICK_STEP_HZ) {
    const x = scale.xOf(hz);
    if (x < x0 - 0.5 || x > x1 + 0.5) continue;
    const labeled = Math.round(hz / SPECTRUM_TICK_STEP_HZ) % step === 0;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + (labeled ? 4 : 2));
    ctx.stroke();
    if (labeled) ctx.fillText(formatFrequencyTick(hz), x, y1 + 6);
  }
  ctx.fillText("Frecuencia (Hz)", (x0 + x1) / 2, view.height - 12);

  // Eje Y — potencia, escala automática.
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const p of niceTicks(p0, p1)) {
    const y = scale.yOf(p);
    if (y < y0 - 0.5 || y > y1 + 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y);
    ctx.lineTo(x0, y);
    ctx.stroke();
    ctx.fillText(formatTick(p), x0 - 6, y);
  }

  ctx.save();
  ctx.translate(11, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Potencia", 0, 0);
  ctx.restore();

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
