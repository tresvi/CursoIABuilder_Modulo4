import { apiFetch } from "./client";
import type { Signal } from "../signal/signalModel";

/** Un punto del espectro de potencia: frecuencia (Hz) y su potencia. */
export interface SpectrumPoint {
  frequency: number;
  power: number;
}

interface SpectrumApiResponse {
  spectrum: { points: SpectrumPoint[] };
}

/**
 * Calcula el espectro de potencia en el backend (contracts/api.md, feature 004).
 * `signal` ya debe ser solo la ventana de tiempo visible (research.md D2): esta
 * función no la recorta, envía exactamente lo que recibe.
 */
export async function computeSpectrum(signal: Signal): Promise<SpectrumPoint[]> {
  const body = { signal: { samples: signal.samples, fs: signal.fs } };
  const res = await apiFetch<SpectrumApiResponse>("/api/spectrum", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.spectrum.points;
}
