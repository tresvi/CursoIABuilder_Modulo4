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
