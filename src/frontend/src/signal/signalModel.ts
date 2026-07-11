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

/**
 * Estado de derivación de la señal de trabajo respecto de la original.
 * Mantiene la original inmutable para poder revertir el filtro (T042/T051a).
 */
export interface SignalState {
  /** señal original cargada — nunca se sobrescribe */
  readonly original: Signal;
  /** señal de trabajo mostrada (puede estar filtrada y/o recortada) */
  readonly working: Signal;
}

export function initState(original: Signal): SignalState {
  return { original, working: original };
}
