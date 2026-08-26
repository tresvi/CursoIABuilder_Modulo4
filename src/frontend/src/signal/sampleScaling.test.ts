import { describe, it, expect } from "vitest";
import { toMillivolts } from "./sampleScaling";

describe("toMillivolts (feature 005, FR-006)", () => {
  it("cuenta 0 da 0 mV", () => {
    expect(toMillivolts(0)).toBeCloseTo(0, 6);
  });

  it("cuenta 2048 da aproximadamente 5 mV", () => {
    expect(toMillivolts(2048)).toBeCloseTo(5, 2);
  });

  it("cuenta 4095 da aproximadamente 10 mV", () => {
    expect(toMillivolts(4095)).toBeCloseTo(10, 2);
  });

  it("es lineal con span 10/4095", () => {
    const span = 10 / 4095;
    expect(toMillivolts(1000)).toBeCloseTo(1000 * span, 9);
  });
});
