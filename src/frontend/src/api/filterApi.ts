import { apiFetch } from "./client";
import type { Sample, Signal } from "../signal/signalModel";

/** Tipos de filtro digital (coincide con el contrato del backend). */
export type FilterKind =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "notch"
  | "movingaverage"
  | "median"
  | "savgol";

export interface FilterConfig {
  type: FilterKind;
  cutoffLow?: number | null;
  cutoffHigh?: number | null;
  /** Tamaño de ventana en muestras (media móvil, mediana, Savitzky–Golay). */
  window?: number | null;
  /** Grado del polinomio (solo Savitzky–Golay). */
  polyOrder?: number | null;
}

interface FilterResponse {
  signal: { samples: Sample[]; fs: number };
}

/**
 * Aplica un filtro DSP en el backend (RF-10). Envía la señal (original completa)
 * y devuelve las muestras filtradas, sin mutar la original (Principio II).
 */
export async function applyFilter(
  signal: Signal,
  filter: FilterConfig
): Promise<Sample[]> {
  const body = {
    signal: { samples: signal.samples, fs: signal.fs },
    filter,
  };
  const res = await apiFetch<FilterResponse>("/api/filter", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.signal.samples;
}
