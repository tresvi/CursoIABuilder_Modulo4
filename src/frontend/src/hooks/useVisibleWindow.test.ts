import { describe, it, expect } from "vitest";
import { panWindow, type VisibleWindow } from "./useVisibleWindow";

const full: VisibleWindow = { fromTime: 0, toTime: 60 };

describe("panWindow (desplazamiento horizontal, recalcula métricas al mover, FR-023)", () => {
  it("desplaza la ventana conservando su ancho", () => {
    const w = { fromTime: 10, toTime: 20 };
    expect(panWindow(w, 5, full)).toEqual({ fromTime: 15, toTime: 25 });
    expect(panWindow(w, -5, full)).toEqual({ fromTime: 5, toTime: 15 });
  });

  it("hace clamp al inicio de la señal (no se pasa por la izquierda)", () => {
    const w = { fromTime: 3, toTime: 13 };
    expect(panWindow(w, -10, full)).toEqual({ fromTime: 0, toTime: 10 });
  });

  it("hace clamp al final de la señal (no se pasa por la derecha)", () => {
    const w = { fromTime: 45, toTime: 55 };
    expect(panWindow(w, 20, full)).toEqual({ fromTime: 50, toTime: 60 });
  });

  it("si la ventana ya abarca toda la señal, no hay nada que desplazar", () => {
    expect(panWindow({ fromTime: 0, toTime: 60 }, 5, full)).toEqual(full);
  });
});
