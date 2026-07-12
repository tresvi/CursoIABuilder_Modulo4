import { createSignal, type CropRange, type Sample, type Signal } from "./signalModel";

/**
 * Modelo de un recorte en curso: seleccionado con el mouse pero aún NO aplicado
 * hasta que el usuario confirma (Principio III, FR-010, AC-12/13).
 */
export interface PendingCrop extends CropRange {
  status: "pending";
}

/**
 * Genera una NUEVA señal acotada al rango temporal (no muta la original).
 * Se invoca solo tras la confirmación explícita del usuario (AC-13).
 */
export function cropSignal(signal: Signal, range: CropRange): Signal {
  const samples: Sample[] = signal.samples.filter(
    (s) => s.t >= range.fromTime && s.t <= range.toTime
  );
  return createSignal(samples);
}
