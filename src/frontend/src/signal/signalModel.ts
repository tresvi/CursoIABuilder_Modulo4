/**
 * Modelo de dominio de la señal ECG (monocanal).
 * Principio II (Integridad de la Señal Original): `originalSamples` es inmutable;
 * el filtro y el recorte producen series derivadas y siempre se puede revertir.
 */

export interface Sample {
  /** tiempo en segundos */
  t: number;
  /** amplitud en mV */
  v: number;
}

export interface Signal {
  /** muestras en orden temporal creciente */
  readonly samples: readonly Sample[];
  /** frecuencia de muestreo derivada (Hz) */
  readonly fs: number;
  /** duración en segundos */
  readonly durationSec: number;
}

/**
 * Deriva la frecuencia de muestreo a partir de la mediana de Δt (research.md D7).
 * Devuelve 0 si no hay suficientes muestras para estimar un paso.
 */
export function deriveFs(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0;
  const deltas: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt > 0) deltas.push(dt);
  }
  if (deltas.length === 0) return 0;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const medianDt =
    deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];
  return medianDt > 0 ? 1 / medianDt : 0;
}

/** Construye una `Signal` a partir de muestras, derivando fs y duración. */
export function createSignal(samples: Sample[]): Signal {
  const durationSec =
    samples.length > 0 ? samples[samples.length - 1].t - samples[0].t : 0;
  return {
    samples,
    fs: deriveFs(samples),
    durationSec,
  };
}

export interface CropRange {
  fromTime: number;
  toTime: number;
}

/**
 * Derivación de la señal de trabajo respecto de la original (Principio II,
 * FR-019, data-model.md). La original es inmutable; el filtro y el recorte son
 * capas reversibles que se componen en el orden `original → filtro → recorte`.
 *
 * `filteredSamples` son las muestras que devuelve el backend al filtrar la señal
 * original completa (mismo eje temporal); `null` = sin filtro.
 */
export interface Derivation {
  readonly original: Signal;
  readonly filteredSamples: readonly Sample[] | null;
  readonly crop: CropRange | null;
}

export function initDerivation(original: Signal): Derivation {
  return { original, filteredSamples: null, crop: null };
}

/** Reconstruye la señal de trabajo aplicando filtro (si hay) y luego recorte. */
export function deriveWorking(d: Derivation): Signal {
  const base = d.filteredSamples ?? d.original.samples;
  const samples = d.crop
    ? base.filter((s) => s.t >= d.crop!.fromTime && s.t <= d.crop!.toTime)
    : base.slice();
  return createSignal(samples as Sample[]);
}

/** Aplica un filtro: guarda las muestras filtradas de la señal original completa. */
export function applyFilter(
  d: Derivation,
  filteredFullSamples: readonly Sample[]
): Derivation {
  return { ...d, filteredSamples: filteredFullSamples };
}

/** Revierte el filtro exactamente al original (conservando el recorte vigente). */
export function revertFilter(d: Derivation): Derivation {
  return { ...d, filteredSamples: null };
}

/** Aplica (o reemplaza) el recorte al rango temporal indicado. */
export function applyCrop(d: Derivation, range: CropRange): Derivation {
  return { ...d, crop: range };
}

export function clearCrop(d: Derivation): Derivation {
  return { ...d, crop: null };
}
