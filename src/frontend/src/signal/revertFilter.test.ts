import { describe, it, expect } from "vitest";
import {
  createSignal,
  initDerivation,
  applyFilter,
  revertFilter,
  deriveWorking,
  type Sample,
} from "./signalModel";

function ramp(n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({ t: i * 0.004, v: i }));
}

describe("revertFilter (FR-008/019, AC-15, SC-009)", () => {
  it("tras revertir, la señal de trabajo coincide EXACTAMENTE con la original", () => {
    const original = createSignal(ramp(50));
    let d = initDerivation(original);

    // aplicar un filtro (muestras arbitrarias del backend)
    const filtered = original.samples.map((s) => ({
      t: s.t,
      v: s.v * 0.3 + 1,
    }));
    d = applyFilter(d, filtered);
    // la de trabajo ahora difiere de la original
    expect(deriveWorking(d).samples.map((s) => s.v)).not.toEqual(
      original.samples.map((s) => s.v)
    );

    // revertir → exactamente la original
    d = revertFilter(d);
    const reverted = deriveWorking(d);
    expect(reverted.samples.map((s) => s.v)).toEqual(
      original.samples.map((s) => s.v)
    );
    expect(reverted.samples.map((s) => s.t)).toEqual(
      original.samples.map((s) => s.t)
    );
  });
});
