import { describe, it, expect } from "vitest";
import {
  createSignal,
  initDerivation,
  deriveWorking,
  applyFilter,
  revertFilter,
  applyCrop,
  type Sample,
} from "./signalModel";

function ramp(n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({ t: i, v: i }));
}

/** Filtro simulado (el DSP real corre en el backend): escala la amplitud. */
function fakeFilter(samples: readonly Sample[]): Sample[] {
  return samples.map((s) => ({ t: s.t, v: s.v * 0.5 }));
}

describe("interacción filtro↔recorte (FR-019, spec.md edge case, T045a)", () => {
  it("revertir un filtro sobre una señal recortada devuelve el tramo conservado SIN filtro", () => {
    const original = createSignal(ramp(11)); // v = t
    let d = initDerivation(original);

    // aplicar filtro (working filtrado) y luego recortar a [3,6]
    d = applyFilter(d, fakeFilter(original.samples));
    d = applyCrop(d, { fromTime: 3, toTime: 6 });

    const filteredCropped = deriveWorking(d);
    expect(filteredCropped.samples.map((s) => s.t)).toEqual([3, 4, 5, 6]);
    expect(filteredCropped.samples.map((s) => s.v)).toEqual([1.5, 2, 2.5, 3]); // filtrado

    // revertir el filtro: el recorte se conserva, el filtro desaparece
    d = revertFilter(d);
    const revertedCropped = deriveWorking(d);
    expect(revertedCropped.samples.map((s) => s.t)).toEqual([3, 4, 5, 6]);
    expect(revertedCropped.samples.map((s) => s.v)).toEqual([3, 4, 5, 6]); // original
  });

  it("recortar sobre una señal filtrada no impide revertir el filtro después", () => {
    const original = createSignal(ramp(11));
    let d = initDerivation(original);
    d = applyFilter(d, fakeFilter(original.samples));
    d = applyCrop(d, { fromTime: 0, toTime: 10 });
    d = revertFilter(d);
    expect(d.filteredSamples).toBeNull();
    expect(deriveWorking(d).samples.map((s) => s.v)).toEqual(
      original.samples.map((s) => s.v)
    );
  });
});
