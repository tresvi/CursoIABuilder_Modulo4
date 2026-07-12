import { createScale, type ViewBox } from "../render/ecgScale";

export interface RulerMeasure {
  /** diferencia de tiempo en segundos (signo según dirección) */
  dt: number;
  /** diferencia de amplitud en mV (signo según dirección) */
  dAmp: number;
}

/**
 * Mide Δt (s) y Δamplitud (mV) entre el punto donde se presiona (x0,y0) y la
 * posición del cursor (x1,y1), sin modificar la señal. FR-009, AC-11.
 */
export function measureRuler(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  view: ViewBox
): RulerMeasure {
  const scale = createScale(view);
  return {
    dt: scale.timeOf(x1) - scale.timeOf(x0),
    dAmp: scale.ampOf(y1) - scale.ampOf(y0),
  };
}

/** Rectángulo (en píxeles) que circunscribe la recta de la regla. */
export interface RulerBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Caja normalizada que circunscribe la recta entre (x0,y0) y (x1,y1). Permite
 * mostrar el área seleccionada por la regla (ancho = Δt, alto = Δamplitud).
 */
export function rulerBox(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): RulerBox {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  };
}
