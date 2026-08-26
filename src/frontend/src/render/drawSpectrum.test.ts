import { describe, it, expect } from "vitest";
import { drawSpectrum, powerRange } from "./drawSpectrum";
import type { ViewBox } from "./ecgScale";
import type { SpectrumPoint } from "../api/spectrumApi";

/** Contexto 2D que registra los métodos invocados (mismo patrón que drawSignal.test.ts). */
function recordingCtx(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "save" || prop === "restore") return () => {};
        return () => {
          calls.push(prop);
        };
      },
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const view: ViewBox = {
  width: 800,
  height: 400,
  padding: 12,
  tRange: [0, 250], // Hz
  vRange: [0, 1], // potencia
};

const points: SpectrumPoint[] = Array.from({ length: 50 }, (_, i) => ({
  frequency: i * 5,
  power: Math.abs(Math.sin(i)),
}));

describe("drawSpectrum (feature 004, research.md D4: reutiliza ecgScale.ts)", () => {
  it("dibuja el espectro como una curva (stroke) sin lanzar con datos normales", () => {
    const { ctx, calls } = recordingCtx();
    drawSpectrum(ctx, points, view);
    expect(calls).toContain("stroke");
  });

  it("no lanza con un espectro vacío", () => {
    const { ctx } = recordingCtx();
    expect(() => drawSpectrum(ctx, [], view)).not.toThrow();
  });

  it("recorta solo a los puntos dentro de view.tRange (reutiliza el mismo criterio de ventana)", () => {
    const { ctx, calls } = recordingCtx();
    const outOfRange: SpectrumPoint[] = [{ frequency: 1000, power: 5 }];
    drawSpectrum(ctx, outOfRange, view);
    // Un solo punto fuera de rango: no debería intentar trazar una línea (sin 2do punto).
    expect(calls).not.toContain("lineTo");
  });
});

describe("powerRange", () => {
  it("siempre arranca en 0 (la potencia no es negativa) y agrega margen arriba", () => {
    const [min, max] = powerRange([
      { frequency: 0, power: 0.2 },
      { frequency: 5, power: 0.8 },
    ]);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(0.8);
  });

  it("con espectro vacío devuelve un rango por defecto sin lanzar", () => {
    const [min, max] = powerRange([]);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(0);
  });
});
