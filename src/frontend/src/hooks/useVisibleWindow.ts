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
 * Desplaza (pan) la ventana `deltaTime` segundos conservando su ancho, sin salir
 * de los límites de la señal (`full`). Si la ventana ya abarca toda la señal,
 * devuelve la ventana completa (no hay nada que desplazar).
 */
export function panWindow(
  window: VisibleWindow,
  deltaTime: number,
  full: VisibleWindow
): VisibleWindow {
  const width = window.toTime - window.fromTime;
  const fullSpan = full.toTime - full.fromTime;
  if (width >= fullSpan) return full;

  let from = window.fromTime + deltaTime;
  from = Math.max(full.fromTime, Math.min(from, full.toTime - width));
  return { fromTime: from, toTime: from + width };
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

  const panBy = useCallback(
    (deltaTime: number) => setWindow((w) => panWindow(w, deltaTime, full)),
    [full]
  );

  const reset = useCallback(() => setWindow(full), [full]);

  return { window, zoomTo, panBy, reset };
}
