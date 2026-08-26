import { describe, it, expect } from "vitest";
import { formatDuration } from "./utils";

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
