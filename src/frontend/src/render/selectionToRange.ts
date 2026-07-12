import { createScale, type ViewBox } from "./ecgScale";
import type { VisibleWindow } from "../hooks/useVisibleWindow";

/** Selección mínima en píxeles para considerarla un arrastre (no un clic). */
const MIN_SELECTION_PX = 4;

/**
 * Convierte una selección horizontal en píxeles (x inicial/final del arrastre)
 * a un rango temporal `[fromTime, toTime]`, ordenado y con clamp al rango visible.
 * La selección abarca todo el eje Y (solo importa X). FR-005, AC-08.
 * Devuelve `null` si el arrastre es demasiado angosto (equivale a un clic).
 */
export function selectionToRange(
  xStart: number,
  xEnd: number,
  view: ViewBox
): VisibleWindow | null {
  if (Math.abs(xEnd - xStart) < MIN_SELECTION_PX) return null;

  const scale = createScale(view);
  const [t0, t1] = view.tRange;
  const clamp = (t: number) => Math.min(t1, Math.max(t0, t));

  const a = clamp(scale.timeOf(xStart));
  const b = clamp(scale.timeOf(xEnd));
  const fromTime = Math.min(a, b);
  const toTime = Math.max(a, b);

  if (toTime <= fromTime) return null;
  return { fromTime, toTime };
}
