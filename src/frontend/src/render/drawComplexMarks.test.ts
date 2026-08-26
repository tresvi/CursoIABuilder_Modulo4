import { describe, it, expect } from "vitest";
import { drawComplexMarks, COMPLEX_POINT_STYLE } from "./drawComplexMarks";
import type { ViewBox } from "./ecgScale";
import type { PqrstComplex } from "../metrics/complexDetection";

/** Contexto 2D que registra llamadas, arcos dibujados y estilos usados. */
function recordingCtx() {
  const calls: string[] = [];
  const arcs: Array<{ x: number; y: number }> = [];
  const styles: string[] = [];
  const ctx = {
    save() {},
    restore() {},
    beginPath() {
      calls.push("beginPath");
    },
    closePath() {
      calls.push("closePath");
    },
    fill() {
      calls.push("fill");
    },
    stroke() {
      calls.push("stroke");
    },
    arc(x: number, y: number) {
      calls.push("arc");
      arcs.push({ x, y });
    },
    moveTo() {
      calls.push("moveTo");
    },
    lineTo() {
      calls.push("lineTo");
    },
    set fillStyle(v: string) {
      styles.push(v);
    },
    get fillStyle() {
      return styles[styles.length - 1];
    },
    set strokeStyle(v: string) {
      styles.push(v);
    },
    get strokeStyle() {
      return styles[styles.length - 1];
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, arcs, styles };
}

const view: ViewBox = {
  width: 800,
  height: 400,
  padding: 12,
  tRange: [0, 4],
  vRange: [-1, 1],
};

function complexAt(rTime: number): PqrstComplex {
  return {
    rTime,
    points: {
      P: { kind: "P", time: rTime - 0.16, amplitude: 0.1 },
      Q: { kind: "Q", time: rTime - 0.04, amplitude: -0.1 },
      R: { kind: "R", time: rTime, amplitude: 1 },
      S: { kind: "S", time: rTime + 0.04, amplitude: -0.15 },
      T: { kind: "T", time: rTime + 0.2, amplitude: 0.3 },
    },
  };
}

describe("drawComplexMarks (FR-004/FR-011)", () => {
  it("dibuja un arco por cada punto (P,Q,R,S,T) de un complejo dentro de la ventana visible", () => {
    const { ctx, arcs } = recordingCtx();
    drawComplexMarks(ctx, [complexAt(2.0)], view);
    expect(arcs).toHaveLength(5);
  });

  it("no dibuja puntos fuera de view.tRange (mismo criterio que drawMarkers)", () => {
    const { ctx, arcs } = recordingCtx();
    // Complejo centrado en 10s: totalmente fuera de tRange [0,4].
    drawComplexMarks(ctx, [complexAt(10.0)], view);
    expect(arcs).toHaveLength(0);
  });

  it("dibuja solo los puntos presentes (P/T pueden faltar)", () => {
    const { ctx, arcs } = recordingCtx();
    const partial: PqrstComplex = {
      rTime: 2.0,
      points: { R: { kind: "R", time: 2.0, amplitude: 1 } },
    };
    drawComplexMarks(ctx, [partial], view);
    expect(arcs).toHaveLength(1);
  });

  it("usa un estilo distinto por tipo de punto y ninguno coincide con el naranja de los marcadores manuales", () => {
    const kinds = Object.keys(COMPLEX_POINT_STYLE) as Array<keyof typeof COMPLEX_POINT_STYLE>;
    expect(kinds.sort()).toEqual(["P", "Q", "R", "S", "T"]);
    const colors = kinds.map((k) => COMPLEX_POINT_STYLE[k].color);
    expect(new Set(colors).size).toBe(colors.length); // los 5 son distintos entre sí
    for (const color of colors) {
      expect(color.toLowerCase()).not.toContain("230,81,0"); // naranja de drawMarkers
      expect(color.toLowerCase()).not.toBe("#e65100");
    }
  });

  it("el punto R se dibuja con mayor radio que el resto (más prominente)", () => {
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.P.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.Q.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.S.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.T.radius);
  });
});
