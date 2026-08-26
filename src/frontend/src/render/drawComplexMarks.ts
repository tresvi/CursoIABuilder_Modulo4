import { createScale, type ViewBox } from "./ecgScale";
import type { PqrstComplex, PqrstKind } from "../metrics/complexDetection";

/**
 * Estilo por tipo de punto (research.md D4): puntos discretos sobre el propio
 * trazado, color y radio distintos entre sí y respecto del naranja usado por
 * los marcadores manuales (`drawMarkers.ts`, FR-011). R es el más prominente.
 */
export const COMPLEX_POINT_STYLE: Record<PqrstKind, { color: string; radius: number }> = {
  P: { color: "#00897b", radius: 4.5 },
  Q: { color: "#5e35b1", radius: 4 },
  R: { color: "#c62828", radius: 6 },
  S: { color: "#3949ab", radius: 4 },
  T: { color: "#00acc1", radius: 4.5 },
};

const ORDER: PqrstKind[] = ["P", "Q", "R", "S", "T"];

/** P/R/T llevan su letra arriba del punto; Q/S, abajo (a pedido del usuario). */
const LABEL_ABOVE = new Set<PqrstKind>(["P", "R", "T"]);

const LABEL_GAP = 3;
const LABEL_FONT = "12px system-ui, sans-serif";

/**
 * Dibuja los puntos P/Q/R/S/T de cada complejo detectado dentro de la ventana
 * visible, sobre el lienzo overlay (junto a `drawMarkers`). Solo se dibujan
 * los puntos presentes (P/T pueden faltar, data-model.md) y los que caen
 * dentro de `view.tRange`. Cada punto lleva su letra en su mismo color.
 */
export function drawComplexMarks(
  ctx: CanvasRenderingContext2D,
  complexes: readonly PqrstComplex[],
  view: ViewBox
): void {
  const scale = createScale(view);
  const [t0, t1] = view.tRange;

  ctx.save();
  ctx.font = LABEL_FONT;
  ctx.textAlign = "center";
  for (const complex of complexes) {
    for (const kind of ORDER) {
      const point = complex.points[kind];
      if (!point) continue;
      if (point.time < t0 || point.time > t1) continue;

      const { color, radius } = COMPLEX_POINT_STYLE[kind];
      const x = scale.xOf(point.time);
      const y = scale.yOf(point.amplitude);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (LABEL_ABOVE.has(kind)) {
        ctx.textBaseline = "bottom";
        ctx.fillText(kind, x, y - radius - LABEL_GAP);
      } else {
        ctx.textBaseline = "top";
        ctx.fillText(kind, x, y + radius + LABEL_GAP);
      }
    }
  }
  ctx.restore();
}
