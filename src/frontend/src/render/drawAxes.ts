import { createScale, plotRect, type ViewBox } from "./ecgScale";

/**
 * Valores de tick "redondos" (1-2-5 × 10ⁿ) dentro de `[min, max]`, apuntando a
 * ~`target` divisiones. Se usan para rotular las escalas de los ejes.
 */
export function niceTicks(min: number, max: number, target = 6): number[] {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(span)) return [min];
  const rawStep = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;

  const ticks: number[] = [];
  const start = Math.ceil(min / step - 1e-9) * step;
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(v);
  return ticks;
}

/** Formatea un valor de tick sin ceros sobrantes (p. ej. 0.5, 1, 1.25). */
export function formatTick(value: number): string {
  const rounded = Number(value.toFixed(3)) + 0; // normaliza -0 → 0
  return String(rounded);
}

/**
 * Dibuja los ejes con su escala numérica: eje X en segundos (abajo) y eje Y en
 * milivoltios (izquierda), con marcas de tick, valores y títulos "t (s)" / "mV".
 * FR-003, AC-04. Se dibuja en el canal de márgenes reservado por los insets.
 */
export function drawAxes(ctx: CanvasRenderingContext2D, view: ViewBox): void {
  const scale = createScale(view);
  const { x0, y0, x1, y1 } = plotRect(view);
  const [t0, t1] = view.tRange;
  const [v0, v1] = view.vRange;

  ctx.save();
  ctx.strokeStyle = "#9e9e9e";
  ctx.fillStyle = "#333";
  ctx.lineWidth = 1;
  ctx.font = "11px system-ui, sans-serif";

  // Líneas de los ejes (borde inferior e izquierdo del área de trazado).
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Eje X — tiempo en segundos (abajo).
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of niceTicks(t0, t1)) {
    const x = scale.xOf(t);
    if (x < x0 - 0.5 || x > x1 + 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + 4);
    ctx.stroke();
    ctx.fillText(formatTick(t), x, y1 + 6);
  }
  ctx.fillText("t (s)", (x0 + x1) / 2, view.height - 12);

  // Eje Y — amplitud en mV (izquierda).
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const v of niceTicks(v0, v1)) {
    const y = scale.yOf(v);
    if (y < y0 - 0.5 || y > y1 + 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(x0 - 4, y);
    ctx.lineTo(x0, y);
    ctx.stroke();
    ctx.fillText(formatTick(v), x0 - 6, y);
  }

  // Título del eje Y (rotado).
  ctx.save();
  ctx.translate(11, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("mV", 0, 0);
  ctx.restore();

  ctx.restore();
}
