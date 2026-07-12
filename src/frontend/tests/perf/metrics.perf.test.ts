import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsv } from "../../src/signal/csvParse";
import { metricsForWindow } from "../../src/metrics/windowMetrics";
import { fullWindow } from "../../src/hooks/useVisibleWindow";

/** Percentil 95 de una serie de mediciones (ms). */
function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const csv = readFileSync(
  resolve(process.cwd(), "tests/fixtures/ecg-1min.csv"),
  "utf8"
);

describe("Rendimiento de cálculo de métricas (SC-002, RNF-03)", () => {
  it("calcula BPM/SDNN/RMSSD/pNN50 en < 0.1 s p95 (20 mediciones, 1 min)", () => {
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const signal = res.signal;
    const win = fullWindow(signal);

    // calentamiento (JIT)
    for (let i = 0; i < 3; i++) metricsForWindow(signal, win);

    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      const m = metricsForWindow(signal, win);
      times.push(performance.now() - t0);
      expect(m.bpm).not.toBeNull(); // la señal de referencia tiene ~60 BPM
    }

    const p = p95(times);
    // umbral RNF-03: < 100 ms
    expect(p).toBeLessThan(100);
  });
});
