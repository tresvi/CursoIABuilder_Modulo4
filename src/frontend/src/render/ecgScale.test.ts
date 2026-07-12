import { describe, it, expect } from "vitest";
import { createScale, plotRect } from "./ecgScale";

describe("createScale (FR-003, AC-04)", () => {
  const view = {
    width: 800,
    height: 400,
    padding: 0,
    tRange: [0, 10] as [number, number],
    vRange: [-1, 1] as [number, number],
  };

  it("mapea tiempo→X: inicio a 0, fin al ancho", () => {
    const s = createScale(view);
    expect(s.xOf(0)).toBeCloseTo(0);
    expect(s.xOf(10)).toBeCloseTo(800);
    expect(s.xOf(5)).toBeCloseTo(400);
  });

  it("mapea amplitud→Y invertido (mV mayor = Y menor, arriba)", () => {
    const s = createScale(view);
    expect(s.yOf(1)).toBeCloseTo(0); // máximo arriba
    expect(s.yOf(-1)).toBeCloseTo(400); // mínimo abajo
    expect(s.yOf(0)).toBeCloseTo(200); // centro
  });

  it("respeta el padding en ambos ejes", () => {
    const s = createScale({ ...view, padding: 20 });
    expect(s.xOf(0)).toBeCloseTo(20);
    expect(s.xOf(10)).toBeCloseTo(780);
    expect(s.yOf(1)).toBeCloseTo(20);
    expect(s.yOf(-1)).toBeCloseTo(380);
  });

  it("invierte X→tiempo (para selección con el mouse)", () => {
    const s = createScale(view);
    expect(s.timeOf(0)).toBeCloseTo(0);
    expect(s.timeOf(800)).toBeCloseTo(10);
    expect(s.timeOf(400)).toBeCloseTo(5);
  });

  it("soporta márgenes asimétricos (canal de rótulos de los ejes)", () => {
    const asym = {
      ...view,
      padLeft: 46,
      padBottom: 30,
      padTop: 10,
      padRight: 10,
    };
    const rect = plotRect(asym);
    expect(rect).toEqual({ x0: 46, y0: 10, x1: 790, y1: 370 });
    const s = createScale(asym);
    // el borde izquierdo del área (t0) cae en padLeft; el eje 0 mV y su inversa
    expect(s.xOf(0)).toBeCloseTo(46);
    expect(s.xOf(10)).toBeCloseTo(790);
    expect(s.timeOf(46)).toBeCloseTo(0);
    expect(s.yOf(1)).toBeCloseTo(10); // máximo arriba (padTop)
    expect(s.yOf(-1)).toBeCloseTo(370); // mínimo abajo (height - padBottom)
  });
});
