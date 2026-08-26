import { describe, it, expect } from "vitest";
import { detectComplexes } from "./complexDetection";
import type { Sample } from "../signal/signalModel";
import type { Signal } from "../signal/signalModel";

/**
 * Genera una señal sintética con forma PQRST (gaussianas apiladas) en cada
 * tiempo de R dado. Offsets/anchos elegidos para dejar margen dentro de un RR
 * de 1 s (60 BPM), consistente con `rPeakDetection.test.ts`.
 */
function syntheticPqrst(rTimes: number[], fs: number, durationSec: number): Sample[] {
  const n = Math.round(durationSec * fs);
  const bumps = [
    { offset: -0.16, amp: 0.15, sigma: 0.02 }, // P
    { offset: -0.04, amp: -0.1, sigma: 0.008 }, // Q
    { offset: 0, amp: 1.0, sigma: 0.01 }, // R
    { offset: 0.04, amp: -0.15, sigma: 0.008 }, // S
    { offset: 0.2, amp: 0.3, sigma: 0.03 }, // T
  ];
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    let v = 0;
    for (const rt of rTimes) {
      for (const b of bumps) {
        const dt = t - (rt + b.offset);
        v += b.amp * Math.exp(-(dt * dt) / (2 * b.sigma * b.sigma));
      }
    }
    samples.push({ t, v });
  }
  return samples;
}

function toSignal(samples: Sample[], fs: number): Signal {
  return { samples, fs, durationSec: samples[samples.length - 1]?.t ?? 0 };
}

describe("detectComplexes", () => {
  it("ubica los 5 puntos (P,Q,R,S,T) de cada latido en una señal típica limpia", () => {
    const fs = 250;
    const rTimes = [1.0, 2.0, 3.0, 4.0];
    const signal = toSignal(syntheticPqrst(rTimes, fs, 4.6), fs);
    const result = detectComplexes(signal);

    expect(result.complexes).toHaveLength(rTimes.length);
    expect(result.lowConfidenceRanges).toEqual([]);

    for (let i = 0; i < rTimes.length; i++) {
      const c = result.complexes[i];
      expect(c.rTime).toBeCloseTo(rTimes[i], 1);
      expect(c.points.R?.time).toBeCloseTo(rTimes[i], 1);
      expect(c.points.Q?.time).toBeCloseTo(rTimes[i] - 0.04, 1);
      expect(c.points.S?.time).toBeCloseTo(rTimes[i] + 0.04, 1);
      expect(c.points.P?.time).toBeCloseTo(rTimes[i] - 0.16, 1);
      expect(c.points.T?.time).toBeCloseTo(rTimes[i] + 0.2, 1);
    }
  });

  it("sobre una señal sin picos R devuelve complexes vacío y toda la señal como baja confianza", () => {
    const fs = 250;
    const samples: Sample[] = Array.from({ length: 500 }, (_, i) => ({
      t: i / fs,
      v: 0,
    }));
    const signal = toSignal(samples, fs);
    const result = detectComplexes(signal);

    expect(result.complexes).toEqual([]);
    expect(result.lowConfidenceRanges).toEqual([
      { fromTime: 0, toTime: signal.durationSec },
    ]);
  });

  it("sobre una señal más corta que un latido no lanza error y no detecta nada", () => {
    const fs = 250;
    const samples: Sample[] = [
      { t: 0, v: 0 },
      { t: 1 / fs, v: 0.1 },
    ];
    const signal = toSignal(samples, fs);
    expect(() => detectComplexes(signal)).not.toThrow();
    expect(detectComplexes(signal).complexes).toEqual([]);
  });

  it("marca como baja confianza solo el tramo ruidoso cuando el resto de la señal es reconocible (US3)", () => {
    const fs = 250;
    // Dos latidos limpios, un hueco de silencio de 3s (sin R plausible), dos latidos limpios más.
    const early = syntheticPqrst([1.0, 2.0], fs, 3.0);
    const silenceStart = 3.0;
    const silenceEnd = 6.0;
    const silence: Sample[] = [];
    for (let t = silenceStart; t < silenceEnd; t += 1 / fs) {
      silence.push({ t, v: 0 });
    }
    const late = syntheticPqrst([1.0, 2.0], fs, 9.0 - 6.0).map((s) => ({
      t: s.t + 6.0,
      v: s.v,
    }));
    const samples = [...early, ...silence, ...late];
    const signal = toSignal(samples, fs);
    const result = detectComplexes(signal);

    expect(result.complexes.map((c) => c.rTime)).toEqual([1.0, 2.0, 7.0, 8.0]);
    expect(result.lowConfidenceRanges).toHaveLength(1);
    expect(result.lowConfidenceRanges[0].fromTime).toBeCloseTo(2.0, 1);
    expect(result.lowConfidenceRanges[0].toTime).toBeCloseTo(7.0, 1);
  });
});
