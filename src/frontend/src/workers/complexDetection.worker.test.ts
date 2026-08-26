import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Sample } from "../signal/signalModel";

/**
 * Test del entry point del Worker (glue mínimo, sin lógica propia): se limita
 * a recibir `{ samples, fs, durationSec }` y reenviar el resultado de
 * `detectComplexes` vía `postMessage`. En jsdom `self` === `window`, así que
 * se puede invocar `self.onmessage` directamente sin un Worker real.
 */
describe("complexDetection.worker (entry)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("al recibir samples/fs/durationSec responde con el ComplexDetectionResult", async () => {
    const postMessageSpy = vi.spyOn(self, "postMessage").mockImplementation(() => {});

    await import("./complexDetection.worker");
    expect(self.onmessage).toBeTypeOf("function");

    const fs = 250;
    const samples: Sample[] = [];
    for (let i = 0; i < Math.round(1.6 * fs); i++) {
      const t = i / fs;
      // pico R simple a los 0.8 s
      const v = Math.exp(-((t - 0.8) ** 2) / (2 * 0.01 * 0.01));
      samples.push({ t, v });
    }

    (self.onmessage as (ev: MessageEvent) => void)({
      data: { samples, fs, durationSec: samples[samples.length - 1].t },
    } as MessageEvent);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const result = postMessageSpy.mock.calls[0][0] as {
      complexes: unknown[];
      lowConfidenceRanges: unknown[];
    };
    expect(result.complexes).toHaveLength(1);

    postMessageSpy.mockRestore();
  });
});
