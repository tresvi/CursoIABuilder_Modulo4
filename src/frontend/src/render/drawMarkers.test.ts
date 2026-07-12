import { describe, expect, it } from "vitest";
import { displayLabel } from "./drawMarkers";

describe("displayLabel (etiqueta sobre el gráfico, US6)", () => {
  it("muestra el texto tal cual hasta 10 caracteres", () => {
    expect(displayLabel("")).toBe("");
    expect(displayLabel("Latido")).toBe("Latido");
    expect(displayLabel("1234567890")).toBe("1234567890"); // exactamente 10
  });

  it("con más de 10 caracteres muestra 8 + '...'", () => {
    expect(displayLabel("12345678901")).toBe("12345678...");
    expect(displayLabel("Extrasístole ventricular")).toBe("Extrasís...");
  });
});
