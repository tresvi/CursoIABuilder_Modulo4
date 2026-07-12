import { describe, it, expect } from "vitest";
import { niceTicks, formatTick } from "./drawAxes";

describe("niceTicks (escala numérica de los ejes, FR-003/AC-04)", () => {
  it("genera pasos redondos (1-2-5) dentro del rango", () => {
    const t = niceTicks(0, 10);
    expect(t[0]).toBeCloseTo(0);
    expect(t[t.length - 1]).toBeCloseTo(10);
    // paso de 2 s para ~6 divisiones en [0,10]
    expect(t[1] - t[0]).toBeCloseTo(2);
  });

  it("funciona con rangos pequeños (amplitud en mV)", () => {
    const t = niceTicks(-1, 1);
    expect(t).toContain(0);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...t)).toBeLessThanOrEqual(1);
  });

  it("se ancla a múltiplos absolutos del paso, no al borde", () => {
    const t = niceTicks(0.15, 0.85);
    // paso ~0.1 → 0.2, 0.3, ... 0.8
    expect(t[0]).toBeCloseTo(0.2);
  });

  it("devuelve un único valor ante un rango nulo", () => {
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});

describe("formatTick", () => {
  it("recorta ceros sobrantes y normaliza el cero con signo", () => {
    expect(formatTick(1.0)).toBe("1");
    expect(formatTick(0.5)).toBe("0.5");
    expect(formatTick(-0)).toBe("0");
    expect(formatTick(-0.25)).toBe("-0.25");
  });
});
