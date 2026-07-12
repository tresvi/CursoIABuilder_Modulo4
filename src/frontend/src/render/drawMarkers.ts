import { createScale, plotRect, type ViewBox } from "./ecgScale";
import type { EventMarker } from "../signal/markers";

/**
 * Dibuja los marcadores de evento como líneas verticales con su etiqueta sobre
 * el lienzo overlay (US6). Solo se dibujan los que caen en la ventana visible.
 */
export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  markers: readonly EventMarker[],
  view: ViewBox
): void {
  const scale = createScale(view);
  const [t0, t1] = view.tRange;
  const { y0, y1 } = plotRect(view);

  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.font = "11px system-ui, sans-serif";
  for (const m of markers) {
    if (m.time < t0 || m.time > t1) continue;
    const x = scale.xOf(m.time);
    ctx.strokeStyle = "rgba(230,81,0,0.9)";
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    if (m.label) {
      ctx.fillStyle = "rgba(230,81,0,1)";
      ctx.fillText(m.label, x + 3, y0 + 12);
    }
  }
  ctx.restore();
}
