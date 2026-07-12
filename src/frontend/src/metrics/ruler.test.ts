import { describe, it, expect } from "vitest";
import { measureRuler } from "./ruler";
import type { ViewBox } from "../render/ecgScale";

const view: ViewBox = {
  width: 800,
  height: 400,
  padding: 0,
  tRange: [0, 10],
  vRange: [-1, 1],
};

describe("measureRuler (FR-009, AC-11)", () => {
  it("calcula Δt (s) y Δamplitud (mV) entre inicio y cursor", () => {
    // de x=200 (t=2.5), y=100 (v=0.5) a x=600 (t=7.5), y=300 (v=-0.5)
    const m = measureRuler(200, 100, 600, 300, view);
    expect(m.dt).toBeCloseTo(5); // 7.5 - 2.5
    expect(m.dAmp).toBeCloseTo(-1); // -0.5 - 0.5
  });

  it("Δt es positivo hacia la derecha y negativo hacia la izquierda", () => {
    const right = measureRuler(200, 200, 600, 200, view);
    const left = measureRuler(600, 200, 200, 200, view);
    expect(right.dt).toBeCloseTo(5);
    expect(left.dt).toBeCloseTo(-5);
  });
});
