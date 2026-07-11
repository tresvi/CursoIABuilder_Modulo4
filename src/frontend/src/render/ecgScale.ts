/**
 * Escalado entre coordenadas de la señal (tiempo en s, amplitud en mV) y píxeles
 * del canvas. El eje Y se invierte (amplitud mayor arriba). FR-003, AC-04.
 */

export interface ViewBox {
  width: number;
  height: number;
  /** margen interior en píxeles aplicado a ambos ejes */
  padding: number;
  /** rango temporal visible [from, to] en segundos */
  tRange: [number, number];
  /** rango de amplitud [min, max] en mV */
  vRange: [number, number];
}

export interface Scale {
  xOf(t: number): number;
  yOf(v: number): number;
  timeOf(x: number): number;
  ampOf(y: number): number;
}

export function createScale(view: ViewBox): Scale {
  const { width, height, padding, tRange, vRange } = view;
  const [t0, t1] = tRange;
  const [v0, v1] = vRange;

  const innerW = width - 2 * padding;
  const innerH = height - 2 * padding;
  const tSpan = t1 - t0 || 1;
  const vSpan = v1 - v0 || 1;

  return {
    xOf(t: number): number {
      return padding + ((t - t0) / tSpan) * innerW;
    },
    yOf(v: number): number {
      // amplitud máxima (v1) → arriba (padding); mínima (v0) → abajo
      return padding + ((v1 - v) / vSpan) * innerH;
    },
    timeOf(x: number): number {
      return t0 + ((x - padding) / innerW) * tSpan;
    },
    ampOf(y: number): number {
      return v1 - ((y - padding) / innerH) * vSpan;
    },
  };
}
