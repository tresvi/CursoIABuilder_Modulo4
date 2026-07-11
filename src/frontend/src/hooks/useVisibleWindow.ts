import { useCallback, useMemo, useState } from "react";
import type { Signal } from "../signal/signalModel";

/** Rango temporal visible sobre el que se calculan las métricas (Principio IV). */
export interface VisibleWindow {
  fromTime: number;
  toTime: number;
}

export function fullWindow(signal: Signal | null): VisibleWindow {
  if (!signal || signal.samples.length === 0) return { fromTime: 0, toTime: 0 };
  return {
    fromTime: signal.samples[0].t,
    toTime: signal.samples[signal.samples.length - 1].t,
  };
}

/**
 * Gestiona la ventana visible. Al cambiar la señal se reinicia a la ventana
 * completa; "restablecer zoom" vuelve a la señal completa (AC-09).
 */
export function useVisibleWindow(signal: Signal | null) {
  const full = useMemo(() => fullWindow(signal), [signal]);
  const [window, setWindow] = useState<VisibleWindow>(full);

  // Reinicia cuando cambia la señal (por identidad de `full`).
  const [lastFull, setLastFull] = useState(full);
  if (lastFull !== full) {
    setLastFull(full);
    setWindow(full);
  }

  const zoomTo = useCallback((fromTime: number, toTime: number) => {
    if (toTime > fromTime) setWindow({ fromTime, toTime });
  }, []);

  const reset = useCallback(() => setWindow(full), [full]);

  return { window, zoomTo, reset };
}
