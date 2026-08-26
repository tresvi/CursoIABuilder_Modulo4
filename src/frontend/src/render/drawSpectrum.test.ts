import { describe, it, expect } from "vitest";
import {
  drawSpectrum,
  powerRange,
  drawSpectrumAxes,
  drawSpectrumGrid,
  frequencyLabelStep,
  formatFrequencyTick,
  SPECTRUM_MAX_FREQ_HZ,
} from "./drawSpectrum";
import { plotRect, type ViewBox } from "./ecgScale";
import type { SpectrumPoint } from "../api/spectrumApi";

/** Un segmento de línea dibujado con moveTo(x0,y0) + lineTo(x1,y1) + stroke(). */
interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Contexto 2D que además registra los textos y los segmentos de línea dibujados. */
function recordingCtxWithText(): {
  ctx: CanvasRenderingContext2D;
  calls: string[];
  texts: string[];
  segments: Segment[];
} {
  const calls: string[] = [];
  const texts: string[] = [];
  const segments: Segment[] = [];
  let pending: { x0: number; y0: number } | null = null;
  const ctx = {
    save() {},
    restore() {},
    beginPath() {
      calls.push("beginPath");
      pending = null;
    },
    moveTo(x: number, y: number) {
      calls.push("moveTo");
      pending = { x0: x, y0: y };
    },
    lineTo(x: number, y: number) {
      calls.push("lineTo");
      if (pending) segments.push({ ...pending, x1: x, y1: y });
    },
    stroke() {
      calls.push("stroke");
    },
    rotate() {},
    translate() {},
    fillText(text: string) {
      calls.push("fillText");
      texts.push(text);
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, texts, segments };
}

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

describe("drawSpectrumAxes (a pedido del usuario: X=Frecuencia 0-100 Hz cada 1 Hz con 1 decimal, Y=Potencia)", () => {
  const axesView: ViewBox = {
    width: 800,
    height: 400,
    padding: 10,
    padLeft: 52,
    padBottom: 34,
    tRange: [0, SPECTRUM_MAX_FREQ_HZ],
    vRange: [0, 1],
  };

  it("dibuja los títulos 'Frecuencia (Hz)' y 'Potencia'", () => {
    const { ctx, texts } = recordingCtxWithText();
    drawSpectrumAxes(ctx, axesView);
    expect(texts).toContain("Frecuencia (Hz)");
    expect(texts).toContain("Potencia");
  });

  it("el dominio del eje X es fijo 0–100 Hz (SPECTRUM_MAX_FREQ_HZ)", () => {
    expect(SPECTRUM_MAX_FREQ_HZ).toBe(100);
  });

  it("las etiquetas del eje X tienen siempre 1 decimal", () => {
    const { ctx, texts } = recordingCtxWithText();
    drawSpectrumAxes(ctx, axesView);
    // Las etiquetas numéricas de X son del estilo "0.0", "10.0", etc.
    const xLabels = texts.filter((t) => /^\d+\.\d$/.test(t));
    expect(xLabels.length).toBeGreaterThan(0);
    for (const label of xLabels) {
      expect(label).toMatch(/^\d+\.\d$/); // exactamente 1 decimal
    }
  });

  it("no dibuja etiquetas de X por fuera de [0, 100]", () => {
    const { ctx, texts } = recordingCtxWithText();
    drawSpectrumAxes(ctx, axesView);
    const xLabels = texts.filter((t) => /^\d+\.\d$/.test(t));
    for (const label of xLabels) {
      expect(Number(label)).toBeGreaterThanOrEqual(0);
      expect(Number(label)).toBeLessThanOrEqual(100);
    }
  });
});

describe("drawSpectrumGrid (líneas completas en los ticks, no solo marcas cortas)", () => {
  const gridView: ViewBox = {
    width: 800,
    height: 400,
    padding: 10,
    padLeft: 52,
    padBottom: 34,
    tRange: [0, SPECTRUM_MAX_FREQ_HZ],
    vRange: [0, 1],
  };
  const { x0, y0, x1, y1 } = plotRect(gridView);

  it("dibuja al menos una vertical de borde a borde del área de trazado (y0→y1)", () => {
    const { ctx, segments } = recordingCtxWithText();
    drawSpectrumGrid(ctx, gridView);
    const verticals = segments.filter((s) => s.x0 === s.x1);
    expect(verticals.length).toBeGreaterThan(0);
    for (const v of verticals) {
      expect(v.y0).toBeCloseTo(y0, 0);
      expect(v.y1).toBeCloseTo(y1, 0);
    }
  });

  it("dibuja al menos una horizontal de borde a borde del área de trazado (x0→x1)", () => {
    const { ctx, segments } = recordingCtxWithText();
    drawSpectrumGrid(ctx, gridView);
    const horizontals = segments.filter((s) => s.y0 === s.y1);
    expect(horizontals.length).toBeGreaterThan(0);
    for (const h of horizontals) {
      expect(h.x0).toBeCloseTo(x0, 0);
      expect(h.x1).toBeCloseTo(x1, 0);
    }
  });

  it("no lanza con un rango degenerado", () => {
    const degenerate: ViewBox = { ...gridView, vRange: [0, 0] };
    const { ctx } = recordingCtxWithText();
    expect(() => drawSpectrumGrid(ctx, degenerate)).not.toThrow();
  });
});

describe("frequencyLabelStep (legibilidad, mismo criterio que GRID_MIN_PX de drawGrid.ts)", () => {
  it("con mucho espacio por Hz, etiqueta cada 1 Hz", () => {
    expect(frequencyLabelStep(50)).toBe(1);
  });

  it("con poco espacio por Hz, agranda el paso para no amontonar etiquetas", () => {
    const step = frequencyLabelStep(2); // 2px por Hz: 100 Hz en 200px, muy poco
    expect(step).toBeGreaterThan(1);
  });

  it("nunca devuelve un paso menor a 1 Hz", () => {
    expect(frequencyLabelStep(1000)).toBeGreaterThanOrEqual(1);
  });
});

describe("formatFrequencyTick", () => {
  it("siempre formatea con exactamente 1 decimal", () => {
    expect(formatFrequencyTick(0)).toBe("0.0");
    expect(formatFrequencyTick(10)).toBe("10.0");
    expect(formatFrequencyTick(49.5)).toBe("49.5");
    expect(formatFrequencyTick(100)).toBe("100.0");
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
