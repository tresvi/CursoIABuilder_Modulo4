import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "../../src/signal/csvParse";
import { drawSignal, amplitudeRange } from "../../src/render/drawSignal";
import { drawGrid } from "../../src/render/drawGrid";
import type { ViewBox } from "../../src/render/ecgScale";

/**
 * Contexto 2D simulado (no-op) para medir SOLO el costo de JavaScript de recorrer
 * las muestras y construir el trazo/rejilla. La rasterización real (GPU) se valida
 * en navegador con el panel Performance (RNF-02, T077/T078).
 */
function fakeCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return new Proxy(
    {},
    {
      get: () => noop,
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;
}

function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const csv = readFileSync(
  resolve(process.cwd(), "tests/fixtures/ecg-1min.csv"),
  "utf8"
);

describe("Rendimiento de render de la señal (SC-001, RNF-01)", () => {
  it("construye rejilla + señal de 1 min en < 0.1 s p95 (20 mediciones)", () => {
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const signal = res.signal;

    const view: ViewBox = {
      width: 900,
      height: 360,
      padding: 12,
      tRange: [
        signal.samples[0].t,
        signal.samples[signal.samples.length - 1].t,
      ],
      vRange: amplitudeRange(signal.samples),
    };
    const ctx = fakeCtx();

    for (let i = 0; i < 3; i++) {
      drawGrid(ctx, view);
      drawSignal(ctx, signal.samples, view);
    }

    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      drawGrid(ctx, view);
      drawSignal(ctx, signal.samples, view);
      times.push(performance.now() - t0);
    }

    expect(p95(times)).toBeLessThan(100);
  });
});
