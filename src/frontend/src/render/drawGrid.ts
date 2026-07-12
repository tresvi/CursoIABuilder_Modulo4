import { createScale, plotRect, type ViewBox } from "./ecgScale";

/** Ganancia clínica: 10 mm/mV → cada mm en el eje Y equivale a 0.1 mV. */
export const MV_PER_MM = 0.1;

/** Separación mínima en píxeles para dibujar un nivel de líneas (legibilidad). */
export const GRID_MIN_PX = 4;

/** Velocidad de papel en mm/s. Afecta la escala temporal del eje X. */
export type PaperSpeed = 25 | 50;

const FINE_COLOR = "#fbe7e7"; // subdivisiones cada 1 mm
const COARSE_COLOR = "#f0c4c4"; // divisiones cada 5 mm (encima de las finas)

/**
 * Valores absolutos múltiplos de `step` dentro de `[min, max]`. Anclar la grilla
 * a valores absolutos (no al borde del gráfico) mantiene las líneas fijas
 * respecto a la señal al hacer pan/zoom, como en el papel real.
 */
export function gridValues(min: number, max: number, step: number): number[] {
  if (step <= 0 || !Number.isFinite(step)) return [];
  const values: number[] = [];
  const start = Math.ceil(min / step - 1e-9) * step;
  for (let v = start; v <= max + step * 1e-9; v += step) values.push(v);
  return values;
}

/**
 * Dibuja la grilla tipo papel milimetrado de ECG sobre el lienzo base (FR-004):
 * subdivisiones finas cada 1 mm y divisiones gruesas cada 5 mm pintadas encima.
 *
 * - Eje Y (amplitud): ganancia fija 10 mm/mV → 1 mm = 0.1 mV, cuadro grande = 0.5 mV.
 * - Eje X (tiempo): 1 mm = 1/paperSpeed s (25 mm/s → 0.04 s; 50 mm/s → 0.02 s).
 *
 * Guarda de legibilidad `GRID_MIN_PX`: un nivel solo se pinta si su separación en
 * pantalla es ≥ 4 px, de modo que al alejar el zoom las finas dejan de dibujarse
 * antes de amontonarse (evita el "borrón"; RNF-01/02).
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: ViewBox,
  paperSpeed: PaperSpeed = 25
): void {
  const scale = createScale(view);
  const [t0, t1] = view.tRange;
  const [v0, v1] = view.vRange;
  const secPerMm = 1 / paperSpeed;
  const { x0, y0, x1, y1 } = plotRect(view);

  const pxPerMmX = Math.abs(scale.xOf(t0 + secPerMm) - scale.xOf(t0));
  const pxPerMmY = Math.abs(scale.yOf(v0 + MV_PER_MM) - scale.yOf(v0));

  ctx.save();

  const drawVertical = (step: number, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const t of gridValues(t0, t1, step)) {
      const x = scale.xOf(t);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
  };
  const drawHorizontal = (step: number, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const v of gridValues(v0, v1, step)) {
      const y = scale.yOf(v);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
  };

  // Finas (1 mm) primero; gruesas (5 mm) encima. Cada nivel solo si su
  // separación en pantalla supera el mínimo legible.
  if (pxPerMmX >= GRID_MIN_PX) drawVertical(secPerMm, FINE_COLOR, 1);
  if (pxPerMmY >= GRID_MIN_PX) drawHorizontal(MV_PER_MM, FINE_COLOR, 1);
  if (pxPerMmX * 5 >= GRID_MIN_PX)
    drawVertical(secPerMm * 5, COARSE_COLOR, 1.3);
  if (pxPerMmY * 5 >= GRID_MIN_PX)
    drawHorizontal(MV_PER_MM * 5, COARSE_COLOR, 1.3);

  ctx.restore();
}
