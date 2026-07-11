import type { ViewBox } from "./ecgScale";

/**
 * Dibuja la rejilla ECG (papel milimetrado) sobre el lienzo base. FR-004, AC-10.
 * Conmutabilidad: el llamador decide invocarla o no según `showGrid`.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: ViewBox,
  opts: { smallPx?: number; largeEvery?: number } = {}
): void {
  const smallPx = opts.smallPx ?? 8;
  const largeEvery = opts.largeEvery ?? 5;
  const { width, height } = view;

  ctx.save();
  ctx.lineWidth = 1;

  for (let x = 0, i = 0; x <= width; x += smallPx, i++) {
    ctx.beginPath();
    ctx.strokeStyle =
      i % largeEvery === 0 ? "rgba(255,120,120,0.55)" : "rgba(255,120,120,0.22)";
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0, j = 0; y <= height; y += smallPx, j++) {
    ctx.beginPath();
    ctx.strokeStyle =
      j % largeEvery === 0 ? "rgba(255,120,120,0.55)" : "rgba(255,120,120,0.22)";
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}
