import { describe, it, expect } from "vitest";
import { selectionToRange } from "./selectionToRange";
import type { ViewBox } from "./ecgScale";

const view: ViewBox = {
  width: 800,
  height: 400,
  padding: 0,
  tRange: [0, 10],
  vRange: [-1, 1],
};

describe("selectionToRange (FR-005, AC-08)", () => {
  it("convierte un arrastre de píxeles a rango temporal [from,to]", () => {
    const r = selectionToRange(200, 600, view);
    expect(r).not.toBeNull();
    expect(r!.fromTime).toBeCloseTo(2.5);
    expect(r!.toTime).toBeCloseTo(7.5);
  });

  it("ordena el rango aunque se arrastre de derecha a izquierda", () => {
    const r = selectionToRange(600, 200, view);
    expect(r!.fromTime).toBeCloseTo(2.5);
    expect(r!.toTime).toBeCloseTo(7.5);
  });

  it("hace clamp al rango temporal visible", () => {
    const r = selectionToRange(-100, 2000, view);
    expect(r!.fromTime).toBeCloseTo(0);
    expect(r!.toTime).toBeCloseTo(10);
  });

  it("devuelve null si la selección es demasiado angosta (clic sin arrastre)", () => {
    expect(selectionToRange(400, 402, view)).toBeNull();
  });
});
