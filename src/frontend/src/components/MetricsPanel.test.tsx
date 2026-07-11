import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricsPanel } from "./MetricsPanel";

describe("MetricsPanel (FR-006)", () => {
  it('muestra "—" para métricas no disponibles, no 0', () => {
    render(
      <MetricsPanel
        metrics={{ bpm: null, sdnn: null, rmssd: null, pnn50: null }}
      />
    );
    expect(screen.getByTestId("metric-bpm")).toHaveTextContent("—");
    expect(screen.getByTestId("metric-sdnn")).toHaveTextContent("—");
    // el panel permanece visible
    expect(screen.getByTestId("metrics-panel")).toBeInTheDocument();
  });

  it("muestra los valores calculados cuando están disponibles", () => {
    render(
      <MetricsPanel
        metrics={{ bpm: 60, sdnn: 42.4, rmssd: 30.1, pnn50: 12.5 }}
      />
    );
    expect(screen.getByTestId("metric-bpm")).toHaveTextContent("60");
    expect(screen.getByTestId("metric-sdnn")).toHaveTextContent("42.4");
    expect(screen.getByTestId("metric-pnn50")).toHaveTextContent("12.5");
  });
});
