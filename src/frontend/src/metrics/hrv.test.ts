import { describe, it, expect } from "vitest";
import { computeHrv } from "./hrv";

describe("computeHrv (FR-006)", () => {
  it("calcula BPM desde picos R equiespaciados a 1 s (60 BPM)", () => {
    const peaks = [0, 1, 2, 3, 4]; // RR = 1000 ms
    const m = computeHrv(peaks);
    expect(m.bpm).toBeCloseTo(60, 5);
    expect(m.sdnn).toBeCloseTo(0, 5); // RR constantes → dispersión 0
    expect(m.rmssd).toBeCloseTo(0, 5);
    expect(m.pnn50).toBeCloseTo(0, 5);
  });

  it("SDNN/RMSSD reflejan variabilidad de los RR", () => {
    // RR (s): 1.0, 0.8, 1.0, 0.8 → variabilidad presente
    const peaks = [0, 1.0, 1.8, 2.8, 3.6];
    const m = computeHrv(peaks);
    expect(m.sdnn).toBeGreaterThan(0);
    expect(m.rmssd).toBeGreaterThan(0);
    // diferencias sucesivas de 200 ms > 50 ms en todos los pares → 100%
    expect(m.pnn50).toBeCloseTo(100, 5);
  });

  it('BPM disponible con 1 intervalo RR; HRV "—" (null) con <2 intervalos', () => {
    const m = computeHrv([0, 1]); // 1 intervalo RR
    expect(m.bpm).toBeCloseTo(60, 5);
    expect(m.sdnn).toBeNull();
    expect(m.rmssd).toBeNull();
    expect(m.pnn50).toBeNull();
  });

  it('todo "—" (null) cuando no hay intervalos RR (0 o 1 pico)', () => {
    const m = computeHrv([2.5]);
    expect(m.bpm).toBeNull();
    expect(m.sdnn).toBeNull();
    expect(m.rmssd).toBeNull();
    expect(m.pnn50).toBeNull();
  });

  it("nunca devuelve 0 para métricas no calculables (usa null)", () => {
    const m = computeHrv([]);
    expect(m.bpm).toBeNull();
    expect(m.sdnn).toBeNull();
  });
});
