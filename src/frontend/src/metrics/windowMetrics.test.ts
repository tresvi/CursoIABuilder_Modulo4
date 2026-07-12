import { describe, it, expect } from "vitest";
import { metricsForWindow, samplesInWindow } from "./windowMetrics";
import { createSignal, type Sample } from "../signal/signalModel";

function syntheticEcg(
  peakTimes: number[],
  fs: number,
  durationSec: number
): Sample[] {
  const n = Math.round(durationSec * fs);
  const sigma = 0.01;
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    let v = 0;
    for (const pt of peakTimes)
      v += Math.exp(-((t - pt) ** 2) / (2 * sigma * sigma));
    samples.push({ t, v });
  }
  return samples;
}

describe("samplesInWindow", () => {
  it("recorta las muestras al rango [from, to] visible", () => {
    const samples: Sample[] = Array.from({ length: 11 }, (_, i) => ({
      t: i,
      v: i,
    }));
    const sig = createSignal(samples);
    const win = samplesInWindow(sig, 3, 6);
    expect(win.map((s) => s.t)).toEqual([3, 4, 5, 6]);
  });
});

describe("metricsForWindow (Principio IV — solo la ventana visible, SC-004)", () => {
  it("calcula métricas SOLO sobre la ventana, no sobre todo el archivo", () => {
    // 60 BPM en la primera mitad, 120 BPM (0.5 s) en la segunda.
    const fs = 250;
    const first = [0.5, 1.5, 2.5, 3.5, 4.5];
    const second = [10, 10.5, 11, 11.5, 12, 12.5, 13];
    const sig = createSignal(syntheticEcg([...first, ...second], fs, 14));

    const mA = metricsForWindow(sig, { fromTime: 0, toTime: 5 });
    const mB = metricsForWindow(sig, { fromTime: 9.5, toTime: 13.5 });

    expect(mA.bpm).toBeCloseTo(60, 0);
    expect(mB.bpm).toBeCloseTo(120, 0);
    // Dos ventanas distintas → BPM distinto (verifica que usa solo la ventana).
    expect(Math.abs((mA.bpm ?? 0) - (mB.bpm ?? 0))).toBeGreaterThan(30);
  });

  it('devuelve "—" (null) cuando la ventana tiene <2 picos', () => {
    const fs = 250;
    const sig = createSignal(syntheticEcg([0.5, 5.0], fs, 6));
    const m = metricsForWindow(sig, { fromTime: 0, toTime: 1 }); // solo 1 pico
    expect(m.bpm).toBeNull();
    expect(m.sdnn).toBeNull();
  });
});
