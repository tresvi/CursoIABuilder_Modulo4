import { describe, it, expect } from "vitest";
import { parseCsv } from "./csvParse";

describe("parseCsv (FR-001/002, AC-01/02/03)", () => {
  it("acepta un CSV válido de un canal con encabezado tiempo/valor", () => {
    const csv = "time,value\n0.000,0.12\n0.004,0.15\n0.008,0.10\n";
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.signal.samples).toHaveLength(3);
      expect(res.signal.samples[0]).toEqual({ t: 0, v: 0.12 });
      expect(res.signal.samples[2]).toEqual({ t: 0.008, v: 0.1 });
      // fs derivada de Δt=0.004 → 250 Hz
      expect(res.signal.fs).toBeCloseTo(250, 5);
    }
  });

  it("respeta el orden temporal del archivo", () => {
    const csv = "t,mv\n0,1\n1,2\n2,3\n";
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.signal.samples.map((s) => s.t)).toEqual([0, 1, 2]);
    }
  });

  it("rechaza un archivo vacío", () => {
    const res = parseCsv("");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("INVALID_SIGNAL");
  });

  it("rechaza un archivo con solo encabezado", () => {
    const res = parseCsv("time,value\n");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("INVALID_SIGNAL");
  });

  it("rechaza columnas faltantes (una sola columna)", () => {
    const res = parseCsv("value\n0.12\n0.15\n");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("INVALID_SIGNAL");
  });

  it("rechaza valores no numéricos", () => {
    const res = parseCsv("time,value\n0.0,abc\n0.004,0.15\n");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("INVALID_SIGNAL");
  });

  it("informa multicanal cuando hay más de un canal (>2 columnas)", () => {
    const csv = "time,ch1,ch2\n0.0,0.1,0.2\n0.004,0.15,0.25\n";
    const res = parseCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("MULTICHANNEL_NOT_SUPPORTED");
  });

  it("ignora líneas de comentario '#' (anotaciones de complejos del ejemplo ESPANTOSO)", () => {
    const csv =
      "tiempo, mV\n0,-0.085\n0.002,-0.08\n" +
      "## 2.268#|#0.83#|#Complejo R\n## 2.479#|#0.233#|#Comp. T ?\n";
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.signal.samples).toHaveLength(2);
      expect(res.signal.samples[1]).toEqual({ t: 0.002, v: -0.08 });
    }
  });

  it("acepta separador ';' y decimales con coma", () => {
    const csv = "time;value\n0,000;0,12\n0,004;0,15\n";
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.signal.samples[0]).toEqual({ t: 0, v: 0.12 });
    }
  });
});
