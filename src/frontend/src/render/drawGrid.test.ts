import { describe, it, expect } from "vitest";
import { gridValues, MV_PER_MM, GRID_MIN_PX } from "./drawGrid";

describe("gridValues (grilla anclada a valores absolutos, FR-004)", () => {
  it("genera múltiplos del paso dentro del rango", () => {
    const v = gridValues(0, 1, 0.2);
    expect(v).toHaveLength(6);
    expect(v[0]).toBeCloseTo(0);
    expect(v[5]).toBeCloseTo(1.0);
  });

  it("se ancla a múltiplos absolutos, no al borde de la ventana", () => {
    // Ventana [0.15, 0.85] con paso 0.2 → líneas en 0.2, 0.4, 0.6, 0.8
    const v = gridValues(0.15, 0.85, 0.2);
    expect(v.map((x) => Number(x.toFixed(2)))).toEqual([0.2, 0.4, 0.6, 0.8]);
  });

  it("soporta rangos con valores negativos (amplitud)", () => {
    const v = gridValues(-0.25, 0.25, MV_PER_MM);
    // `+ 0` normaliza el cero con signo (-0 → 0) para la comparación
    expect(v.map((x) => Number(x.toFixed(1)) + 0)).toEqual([
      -0.2, -0.1, 0, 0.1, 0.2,
    ]);
  });

  it("devuelve vacío ante un paso no válido", () => {
    expect(gridValues(0, 1, 0)).toEqual([]);
    expect(gridValues(0, 1, -0.1)).toEqual([]);
  });

  it("escalas clínicas: 5 mm = 0.5 mV en Y", () => {
    expect(MV_PER_MM * 5).toBeCloseTo(0.5);
  });

  it("mínimo legible por defecto de 4 px", () => {
    expect(GRID_MIN_PX).toBe(4);
  });
});
