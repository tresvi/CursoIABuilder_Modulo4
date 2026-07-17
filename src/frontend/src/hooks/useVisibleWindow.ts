import { useCallback, useMemo, useState } from "react";
import type { Signal } from "../signal/signalModel";

/** Rango temporal visible sobre el que se calculan las métricas (Principio IV). */
export interface VisibleWindow {
  fromTime: number;
  toTime: number;
}

/**
 * Duración (segundos) que se muestra por defecto al cargar un archivo. Si el
 * ensayo es más largo, la vista inicial se acota a los primeros N segundos para
 * no dibujar demasiadas muestras (rendimiento y legibilidad); el usuario puede
 * desplazarse o "Restablecer zoom" para ver todo.
 */
export const MAX_INITIAL_SECONDS = 20;

export function fullWindow(signal: Signal | null): VisibleWindow {
  if (!signal || signal.samples.length === 0) return { fromTime: 0, toTime: 0 };
  return {
    fromTime: signal.samples[0].t,
    toTime: signal.samples[signal.samples.length - 1].t,
  };
}

/** Ventana inicial: los primeros `MAX_INITIAL_SECONDS` de la señal (o menos). */
export function initialWindow(full: VisibleWindow): VisibleWindow {
  return {
    fromTime: full.fromTime,
    toTime: Math.min(full.toTime, full.fromTime + MAX_INITIAL_SECONDS),
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
 * Gestiona la ventana visible. Reglas de reinicio:
 * - Al **cargar** otro archivo (cambia `loadKey`): la vista inicial se acota a
 *   los primeros `MAX_INITIAL_SECONDS`.
 * - Al **recortar** (cambia el rango sin recargar): muestra el rango recortado.
 * - Al **filtrar** (mismo `loadKey` y mismo rango, solo cambian amplitudes): la
 *   ventana se conserva (no se pierde el zoom).
 * "Restablecer zoom" vuelve a la señal completa (AC-09), sin el tope de 20 s.
 *
 * `loadKey` debe cambiar solo al cargar una señal nueva (p. ej. la identidad de
 * la señal original), y mantenerse estable al filtrar o recortar.
 */
export function useVisibleWindow(signal: Signal | null, loadKey?: unknown) {
  const full = useMemo(() => fullWindow(signal), [signal]);
  const [window, setWindow] = useState<VisibleWindow>(() => initialWindow(full));

  const [lastLoadKey, setLastLoadKey] = useState(loadKey);
  const [lastFull, setLastFull] = useState(full);

  if (lastLoadKey !== loadKey) {
    // Nuevo archivo cargado: vista inicial acotada a los primeros 20 s.
    setLastLoadKey(loadKey);
    setLastFull(full);
    setWindow(initialWindow(full));
  } else if (
    lastFull.fromTime !== full.fromTime ||
    lastFull.toTime !== full.toTime
  ) {
    // Cambió el rango sin recargar (recorte): mostrar el rango completo.
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
