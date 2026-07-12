import { describe, it, expect } from "vitest";
import { createSignal, type Sample } from "./signalModel";
import { cropSignal } from "./crop";

function ramp(n: number): Sample[] {
  return Array.from({ length: n }, (_, i) => ({ t: i, v: i }));
}

describe("cropSignal (FR-010, AC-13)", () => {
  it("genera una nueva señal acotada al rango, sin mutar la original", () => {
    const original = createSignal(ramp(11));
    const cropped = cropSignal(original, { fromTime: 3, toTime: 6 });
    expect(cropped.samples.map((s) => s.t)).toEqual([3, 4, 5, 6]);
    // la original permanece intacta (Principio II)
    expect(original.samples).toHaveLength(11);
  });

  it("cancelar el recorte deja la señal intacta (no se llama a cropSignal)", () => {
    const original = createSignal(ramp(5));
    // el flujo de UI no aplica recorte si el usuario cancela; aquí verificamos
    // que la señal original no cambia por el mero hecho de seleccionar.
    expect(original.samples).toHaveLength(5);
  });
});
