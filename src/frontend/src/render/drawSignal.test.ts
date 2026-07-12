import { describe, it, expect } from "vitest";
import { drawSignal, amplitudeRange } from "./drawSignal";
import { drawGrid } from "./drawGrid";
import type { ViewBox } from "./ecgScale";
import type { Sample } from "../signal/signalModel";

/** Contexto 2D que registra los métodos invocados (para verificar el orden). */
function recordingCtx(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "save" || prop === "restore") return () => {};
        return () => {
          calls.push(prop);
        };
      },
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const view: ViewBox = {
  width: 800,
  height: 400,
  padding: 12,
  tRange: [0, 4],
  vRange: [-1, 1],
};

const samples: Sample[] = Array.from({ length: 100 }, (_, i) => ({
  t: i * 0.04,
  v: Math.sin(i),
}));

describe("drawSignal (regresión: no debe limpiar el lienzo)", () => {
  it("NO llama a clearRect (para no borrar la grilla ya pintada)", () => {
    const { ctx, calls } = recordingCtx();
    drawSignal(ctx, samples, view);
    expect(calls).not.toContain("clearRect");
    // sí dibuja el trazo
    expect(calls).toContain("stroke");
  });

  it("la grilla persiste: dibujar grilla y luego señal no borra la grilla", () => {
    const { ctx, calls } = recordingCtx();
    drawGrid(ctx, view, 25);
    const gridStrokes = calls.filter((c) => c === "stroke").length;
    expect(gridStrokes).toBeGreaterThan(0);
    drawSignal(ctx, samples, view);
    // ningún clearRect entre medio → los trazos de grilla no se borran
    expect(calls).not.toContain("clearRect");
  });
});

describe("amplitudeRange", () => {
  it("añade margen alrededor del rango de amplitud", () => {
    const [min, max] = amplitudeRange([
      { t: 0, v: -1 },
      { t: 1, v: 1 },
    ]);
    expect(min).toBeLessThan(-1);
    expect(max).toBeGreaterThan(1);
  });
});
