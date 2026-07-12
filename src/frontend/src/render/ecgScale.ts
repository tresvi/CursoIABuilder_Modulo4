/**
 * Escalado entre coordenadas de la señal (tiempo en s, amplitud en mV) y píxeles
 * del canvas. El eje Y se invierte (amplitud mayor arriba). FR-003, AC-04.
 */

export interface ViewBox {
  width: number;
  height: number;
  /** margen interior por defecto (px) para los lados no especificados abajo */
  padding: number;
  /** márgenes por lado (px); si faltan se usa `padding`. Dejan lugar a los rótulos de los ejes. */
  padLeft?: number;
  padRight?: number;
  padTop?: number;
  padBottom?: number;
  /** rango temporal visible [from, to] en segundos */
  tRange: [number, number];
  /** rango de amplitud [min, max] en mV */
  vRange: [number, number];
}

export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Márgenes efectivos por lado (usa `padding` como valor por defecto). */
export function insetsOf(view: ViewBox): Insets {
  return {
    left: view.padLeft ?? view.padding,
    right: view.padRight ?? view.padding,
    top: view.padTop ?? view.padding,
    bottom: view.padBottom ?? view.padding,
  };
}

/** Rectángulo del área de trazado (dentro de los márgenes). */
export function plotRect(view: ViewBox): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  const i = insetsOf(view);
  return {
    x0: i.left,
    y0: i.top,
    x1: view.width - i.right,
    y1: view.height - i.bottom,
  };
}

export interface Scale {
  xOf(t: number): number;
  yOf(v: number): number;
  timeOf(x: number): number;
  ampOf(y: number): number;
}

export function createScale(view: ViewBox): Scale {
  const { tRange, vRange } = view;
  const [t0, t1] = tRange;
  const [v0, v1] = vRange;
  const { left, top } = insetsOf(view);
  const { x0, y0, x1, y1 } = plotRect(view);

  const innerW = x1 - x0;
  const innerH = y1 - y0;
  const tSpan = t1 - t0 || 1;
  const vSpan = v1 - v0 || 1;

  return {
    xOf(t: number): number {
      return left + ((t - t0) / tSpan) * innerW;
    },
    yOf(v: number): number {
      // amplitud máxima (v1) → arriba (top); mínima (v0) → abajo
      return top + ((v1 - v) / vSpan) * innerH;
    },
    timeOf(x: number): number {
      return t0 + ((x - left) / innerW) * tSpan;
    },
    ampOf(y: number): number {
      return v1 - ((y - top) / innerH) * vSpan;
    },
  };
}
