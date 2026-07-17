import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar, formatDuration } from "./TopBar";

describe("formatDuration (HH:MM:SS)", () => {
  it("formatea segundos, minutos y horas con dos dígitos", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(20)).toBe("00:00:20");
    expect(formatDuration(75)).toBe("00:01:15");
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("redondea al segundo y nunca es negativo", () => {
    expect(formatDuration(19.6)).toBe("00:00:20");
    expect(formatDuration(-5)).toBe("00:00:00");
  });
});

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
