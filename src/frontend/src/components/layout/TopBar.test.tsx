import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "./TopBar";

describe("TopBar — indicador de duración", () => {
  const base = {
    fileName: "ecg.csv",
    hasSignal: true,
    dirty: false,
    saveStatus: null,
    showGrid: true,
    paperSpeed: 25 as const,
    onPaperSpeed: () => {},
  };

  it("muestra la duración cuando hay señal", () => {
    render(<TopBar {...base} durationSec={20} />);
    expect(screen.getByTestId("duration")).toHaveTextContent("00:00:20");
  });

  it("no muestra la duración sin señal", () => {
    render(<TopBar {...base} hasSignal={false} durationSec={null} />);
    expect(screen.queryByTestId("duration")).toBeNull();
  });
});
