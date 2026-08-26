import { describe, it, expect } from "vitest";
import { drawComplexMarks, COMPLEX_POINT_STYLE } from "./drawComplexMarks";
import type { ViewBox } from "./ecgScale";
import type { PqrstComplex } from "../metrics/complexDetection";

/** Contexto 2D que registra llamadas, arcos dibujados, textos y estilos usados. */
function recordingCtx() {
  const calls: string[] = [];
  const arcs: Array<{ x: number; y: number }> = [];
  const styles: string[] = [];
  const texts: Array<{ text: string; x: number; y: number; color: string }> = [];
  let currentFillStyle = "";
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
    fillText(text: string, x: number, y: number) {
      calls.push("fillText");
      texts.push({ text, x, y, color: currentFillStyle });
    },
    font: "",
    textAlign: "",
    textBaseline: "",
    set fillStyle(v: string) {
      currentFillStyle = v;
      styles.push(v);
    },
    get fillStyle() {
      return currentFillStyle;
    },
    set strokeStyle(v: string) {
      styles.push(v);
    },
    get strokeStyle() {
      return styles[styles.length - 1];
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, arcs, texts, styles };
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
  it("dibuja un arco y una letra por cada punto (P,Q,R,S,T) de un complejo visible", () => {
    const { ctx, arcs, texts } = recordingCtx();
    drawComplexMarks(ctx, [complexAt(2.0)], view);
    expect(arcs).toHaveLength(5);
    expect(texts).toHaveLength(5);
    expect(texts.map((t) => t.text).sort()).toEqual(["P", "Q", "R", "S", "T"]);
  });

  it("no dibuja puntos ni letras fuera de view.tRange (mismo criterio que drawMarkers)", () => {
    const { ctx, arcs, texts } = recordingCtx();
    // Complejo centrado en 10s: totalmente fuera de tRange [0,4].
    drawComplexMarks(ctx, [complexAt(10.0)], view);
    expect(arcs).toHaveLength(0);
    expect(texts).toHaveLength(0);
  });

  it("dibuja solo los puntos presentes (P/T pueden faltar)", () => {
    const { ctx, arcs, texts } = recordingCtx();
    const partial: PqrstComplex = {
      rTime: 2.0,
      points: { R: { kind: "R", time: 2.0, amplitude: 1 } },
    };
    drawComplexMarks(ctx, [partial], view);
    expect(arcs).toHaveLength(1);
    expect(texts).toHaveLength(1);
    expect(texts[0].text).toBe("R");
  });

  it("P/R/T llevan su letra arriba del punto y Q/S abajo, en su propio color", () => {
    const { ctx, arcs, texts } = recordingCtx();
    drawComplexMarks(ctx, [complexAt(2.0)], view);

    const byKind = (kind: string) => {
      const i = ["P", "Q", "R", "S", "T"].indexOf(kind);
      return { arc: arcs[i], text: texts.find((t) => t.text === kind)! };
    };

    for (const kind of ["P", "R", "T"] as const) {
      const { arc, text } = byKind(kind);
      expect(text.y).toBeLessThan(arc.y); // "arriba" = menor y en canvas
      expect(text.x).toBeCloseTo(arc.x, 5);
      expect(text.color).toBe(COMPLEX_POINT_STYLE[kind].color);
    }
    for (const kind of ["Q", "S"] as const) {
      const { arc, text } = byKind(kind);
      expect(text.y).toBeGreaterThan(arc.y); // "abajo" = mayor y en canvas
      expect(text.x).toBeCloseTo(arc.x, 5);
      expect(text.color).toBe(COMPLEX_POINT_STYLE[kind].color);
    }
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

  it("los puntos son más grandes que el tamaño original (radio mínimo 4px)", () => {
    for (const kind of ["P", "Q", "R", "S", "T"] as const) {
      expect(COMPLEX_POINT_STYLE[kind].radius).toBeGreaterThanOrEqual(4);
    }
  });

  it("el punto R se dibuja con mayor radio que el resto (más prominente)", () => {
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.P.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.Q.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.S.radius);
    expect(COMPLEX_POINT_STYLE.R.radius).toBeGreaterThan(COMPLEX_POINT_STYLE.T.radius);
  });
});
