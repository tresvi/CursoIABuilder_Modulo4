import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpectrumChart } from "./SpectrumChart";
import type { SpectrumPoint } from "../api/spectrumApi";

const points: SpectrumPoint[] = [
  { frequency: 0, power: 0.1 },
  { frequency: 5, power: 0.8 },
  { frequency: 10, power: 0.2 },
];

describe("SpectrumChart (feature 004, research.md D3: sin herramientas ni overlay)", () => {
  it("renderiza un único canvas accesible, sin lanzar", () => {
    render(<SpectrumChart points={points} />);
    expect(screen.getByTestId("spectrum-chart")).toBeInTheDocument();
    // Un solo canvas (a diferencia de ECGChart, que tiene base + overlay).
    const canvases = screen.getByTestId("spectrum-chart").querySelectorAll("canvas");
    expect(canvases).toHaveLength(1);
  });

  it("no lanza con un espectro vacío", () => {
    expect(() => render(<SpectrumChart points={[]} />)).not.toThrow();
  });
});
