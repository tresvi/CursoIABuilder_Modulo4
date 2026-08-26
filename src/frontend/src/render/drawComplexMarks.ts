import { createScale, type ViewBox } from "./ecgScale";
import type { PqrstComplex, PqrstKind } from "../metrics/complexDetection";

/**
 * Estilo por tipo de punto (research.md D4): puntos discretos sobre el propio
 * trazado, color y radio distintos entre sí y respecto del naranja usado por
 * los marcadores manuales (`drawMarkers.ts`, FR-011). R es el más prominente.
 */
export const COMPLEX_POINT_STYLE: Record<PqrstKind, { color: string; radius: number }> = {
  P: { color: "#00897b", radius: 2.5 },
  Q: { color: "#5e35b1", radius: 2 },
  R: { color: "#c62828", radius: 3.5 },
  S: { color: "#3949ab", radius: 2 },
  T: { color: "#00acc1", radius: 2.5 },
};

const ORDER: PqrstKind[] = ["P", "Q", "R", "S", "T"];

/**
 * Dibuja los puntos P/Q/R/S/T de cada complejo detectado dentro de la ventana
 * visible, sobre el lienzo overlay (junto a `drawMarkers`). Solo se dibujan
 * los puntos presentes (P/T pueden faltar, data-model.md) y los que caen
 * dentro de `view.tRange`.
 */
export function drawComplexMarks(
  ctx: CanvasRenderingContext2D,
  complexes: readonly PqrstComplex[],
  view: ViewBox
): void {
  const scale = createScale(view);
  const [t0, t1] = view.tRange;

  ctx.save();
  for (const complex of complexes) {
    for (const kind of ORDER) {
      const point = complex.points[kind];
      if (!point) continue;
      if (point.time < t0 || point.time > t1) continue;

      const { color, radius } = COMPLEX_POINT_STYLE[kind];
      const x = scale.xOf(point.time);
      const y = scale.yOf(point.amplitude);

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
