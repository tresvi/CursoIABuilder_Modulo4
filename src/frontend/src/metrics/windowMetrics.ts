import type { Signal, Sample } from "../signal/signalModel";
import type { VisibleWindow } from "../hooks/useVisibleWindow";
import { detectRPeaks } from "./rPeakDetection";
import { computeHrv, type CardiacMetrics } from "./hrv";

/** Devuelve las muestras cuyo tiempo cae dentro de [fromTime, toTime]. */
export function samplesInWindow(
  signal: Signal,
  fromTime: number,
  toTime: number
): Sample[] {
  return signal.samples.filter((s) => s.t >= fromTime && s.t <= toTime);
}

/**
 * Calcula las métricas cardíacas SOLO sobre la ventana visible (Principio IV,
 * FR-006, SC-004): recorta por ventana → detecta picos R → HRV.
 */
export function metricsForWindow(
  signal: Signal,
  window: VisibleWindow
): CardiacMetrics {
  const windowed = samplesInWindow(signal, window.fromTime, window.toTime);
  const peaks = detectRPeaks(windowed, signal.fs);
  return computeHrv(peaks);
}
