import { describe, it, expect } from "vitest";
import { detectRPeaks } from "./rPeakDetection";
import type { Sample } from "../signal/signalModel";

/** Genera una señal sintética con picos R (gaussianos) en tiempos dados. */
function syntheticEcg(
  peakTimes: number[],
  fs: number,
  durationSec: number,
  amp = 1
): Sample[] {
  const n = Math.round(durationSec * fs);
  const sigma = 0.01; // ancho del pico (s)
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    let v = 0;
    for (const pt of peakTimes) {
      v += amp * Math.exp(-((t - pt) ** 2) / (2 * sigma * sigma));
    }
    samples.push({ t, v });
  }
  return samples;
}

describe("detectRPeaks (research.md D3)", () => {
  it("detecta picos R periódicos (60 BPM) con sus tiempos aproximados", () => {
    const fs = 250;
    const peaks = [0.5, 1.5, 2.5, 3.5, 4.5];
    const samples = syntheticEcg(peaks, fs, 5.5);
    const found = detectRPeaks(samples, fs);
    expect(found).toHaveLength(peaks.length);
    for (let i = 0; i < peaks.length; i++) {
      expect(found[i]).toBeCloseTo(peaks[i], 1); // dentro de ~0.05 s
    }
  });

  it("aplica período refractario (no dobla picos muy cercanos)", () => {
    const fs = 250;
    const samples = syntheticEcg([1.0, 2.0, 3.0], fs, 3.5);
    const found = detectRPeaks(samples, fs);
    expect(found).toHaveLength(3);
  });

  it("devuelve vacío para señal plana sin picos", () => {
    const fs = 250;
    const samples: Sample[] = Array.from({ length: 500 }, (_, i) => ({
      t: i / fs,
      v: 0,
    }));
    expect(detectRPeaks(samples, fs)).toEqual([]);
  });

  it("devuelve vacío si fs no es válida", () => {
    expect(detectRPeaks([{ t: 0, v: 1 }], 0)).toEqual([]);
  });
});
