import type { Sample, Signal } from "../signal/signalModel";
import { detectRPeaks } from "./rPeakDetection";

/**
 * Detección de complejos PQRST (feature 003, research.md D3): usa los picos R
 * ya detectados por `detectRPeaks` como ancla y ubica Q/S (extremos locales
 * cerca del R) y P/T (extremos locales en ventanas más amplias, escaladas por
 * el intervalo RR local) a lo largo de TODA la señal recibida (FR-003).
 *
 * Función pura: no muta la señal de entrada.
 */

export type PqrstKind = "P" | "Q" | "R" | "S" | "T";

export interface PqrstPoint {
  kind: PqrstKind;
  /** instante en segundos */
  time: number;
  /** amplitud en mV */
  amplitude: number;
}

/** Un latido identificado. `R` siempre presente; el resto puede faltar si no
 * aparece con contraste suficiente (no se inventa una posición). */
export interface PqrstComplex {
  /** ancla del complejo: tiempo del pico R (mismo valor que `detectRPeaks`). */
  rTime: number;
  points: Partial<Record<PqrstKind, PqrstPoint>>;
}

export interface TimeRange {
  fromTime: number;
  toTime: number;
}

export interface ComplexDetectionResult {
  /** complejos detectados con confianza, en orden temporal. */
  complexes: PqrstComplex[];
  /** tramos donde no se pudo detectar con confianza (US3/FR-008). */
  lowConfidenceRanges: TimeRange[];
}

/** Por debajo de esta cantidad de BPM, un hueco entre R consecutivos se
 * considera pérdida de señal (no un latido lento real) — research.md D3. */
const MAX_PLAUSIBLE_RR_SEC = 2.0;

const QS_HALF_WINDOW_SEC = 0.06;
const PT_MIN_WINDOW_SEC = 0.08;
const PT_MAX_WINDOW_SEC = 0.28;
const PT_GAP_FROM_QS_SEC = 0.015;
/** Contraste mínimo (fracción del rango de amplitud global) para aceptar P/T. */
const MIN_CONTRAST_FRACTION = 0.05;

function timeToIndex(samples: readonly Sample[], time: number): number {
  // Búsqueda binaria del índice cuya muestra está más cerca de `time`.
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function amplitudeSpan(samples: readonly Sample[]): number {
  if (samples.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
  }
  return max - min;
}

/** Extremo local (mínimo o máximo) dentro de `[from, to]` (índices inclusive). */
function localExtreme(
  samples: readonly Sample[],
  from: number,
  to: number,
  kind: "min" | "max"
): { idx: number; value: number } | null {
  if (from < 0 || to >= samples.length || from > to) return null;
  let bestIdx = from;
  let bestVal = samples[from].v;
  for (let i = from + 1; i <= to; i++) {
    const v = samples[i].v;
    if (kind === "min" ? v < bestVal : v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, value: bestVal };
}

function toPoint(samples: readonly Sample[], kind: PqrstKind, idx: number): PqrstPoint {
  return { kind, time: samples[idx].t, amplitude: samples[idx].v };
}

export function detectComplexes(signal: Signal): ComplexDetectionResult {
  const { samples, fs, durationSec } = signal;
  const rTimes = detectRPeaks(samples, fs);

  if (rTimes.length === 0 || fs <= 0) {
    return {
      complexes: [],
      lowConfidenceRanges: durationSec > 0 ? [{ fromTime: 0, toTime: durationSec }] : [],
    };
  }

  const ampRange = amplitudeSpan(samples);
  const contrastThreshold = ampRange * MIN_CONTRAST_FRACTION;
  const qsWin = Math.max(1, Math.round(QS_HALF_WINDOW_SEC * fs));
  const gapSamples = Math.max(1, Math.round(PT_GAP_FROM_QS_SEC * fs));

  const rIndices = rTimes.map((t) => timeToIndex(samples, t));
  const complexes: PqrstComplex[] = [];

  for (let i = 0; i < rIndices.length; i++) {
    const rIdx = rIndices[i];
    const points: Partial<Record<PqrstKind, PqrstPoint>> = {
      R: toPoint(samples, "R", rIdx),
    };

    const q = localExtreme(samples, rIdx - qsWin, rIdx - 1, "min");
    if (q) points.Q = toPoint(samples, "Q", q.idx);

    const s = localExtreme(samples, rIdx + 1, rIdx + qsWin, "min");
    if (s) points.S = toPoint(samples, "S", s.idx);

    // Ventana de RR local: hacia el latido anterior/siguiente si existen,
    // si no, un valor por defecto razonable.
    const rrBefore = i > 0 ? rTimes[i] - rTimes[i - 1] : rTimes[i + 1] - rTimes[i] || 0.8;
    const rrAfter = i < rIndices.length - 1 ? rTimes[i + 1] - rTimes[i] : rrBefore;

    if (q) {
      const pWinSec = Math.min(PT_MAX_WINDOW_SEC, Math.max(PT_MIN_WINDOW_SEC, rrBefore * 0.35));
      const pWinSamples = Math.round(pWinSec * fs);
      const pTo = q.idx - gapSamples;
      const pFrom = Math.max(i > 0 ? rIndices[i - 1] + qsWin + 1 : 0, q.idx - pWinSamples);
      // Contraste insuficiente: no se inventa el punto (data-model.md).
      const p = localExtreme(samples, pFrom, pTo, "max");
      if (p && p.value - Math.min(samples[pFrom].v, samples[pTo]?.v ?? p.value) >= contrastThreshold) {
        points.P = toPoint(samples, "P", p.idx);
      }
    }

    if (s) {
      const tWinSec = Math.min(PT_MAX_WINDOW_SEC, Math.max(PT_MIN_WINDOW_SEC, rrAfter * 0.45));
      const tWinSamples = Math.round(tWinSec * fs);
      const tFrom = s.idx + gapSamples;
      const tTo = Math.min(
        i < rIndices.length - 1 ? rIndices[i + 1] - qsWin - 1 : samples.length - 1,
        s.idx + tWinSamples
      );
      const t = localExtreme(samples, tFrom, tTo, "max");
      if (t && t.value - Math.min(samples[tFrom]?.v ?? t.value, samples[tTo].v) >= contrastThreshold) {
        points.T = toPoint(samples, "T", t.idx);
      }
    }

    complexes.push({ rTime: rTimes[i], points });
  }

  // Tramos sin R plausible (antes del primero, entre consecutivos, después del último).
  const lowConfidenceRanges: TimeRange[] = [];
  if (rTimes[0] > MAX_PLAUSIBLE_RR_SEC) {
    lowConfidenceRanges.push({ fromTime: 0, toTime: rTimes[0] });
  }
  for (let i = 1; i < rTimes.length; i++) {
    const gap = rTimes[i] - rTimes[i - 1];
    if (gap > MAX_PLAUSIBLE_RR_SEC) {
      lowConfidenceRanges.push({ fromTime: rTimes[i - 1], toTime: rTimes[i] });
    }
  }
  if (durationSec - rTimes[rTimes.length - 1] > MAX_PLAUSIBLE_RR_SEC) {
    lowConfidenceRanges.push({ fromTime: rTimes[rTimes.length - 1], toTime: durationSec });
  }

  return { complexes, lowConfidenceRanges };
}
