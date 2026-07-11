/**
 * Métricas de variabilidad de la frecuencia cardíaca (HRV) a partir de los
 * tiempos de picos R. FR-006: cuando no hay latidos suficientes, la métrica se
 * reporta como `null` ("no disponible" / "—"), NUNCA como 0.
 *
 * - BPM: requiere ≥ 1 intervalo RR.
 * - SDNN, RMSSD, pNN50: requieren ≥ 2 intervalos RR.
 */
export interface CardiacMetrics {
  /** latidos por minuto */
  bpm: number | null;
  /** desviación estándar de los intervalos NN (ms) */
  sdnn: number | null;
  /** RMS de diferencias sucesivas RR (ms) */
  rmssd: number | null;
  /** % de pares RR consecutivos con |Δ| > 50 ms */
  pnn50: number | null;
}

const UNAVAILABLE: CardiacMetrics = {
  bpm: null,
  sdnn: null,
  rmssd: null,
  pnn50: null,
};

export function computeHrv(rPeakTimesSec: readonly number[]): CardiacMetrics {
  if (rPeakTimesSec.length < 2) return { ...UNAVAILABLE };

  // Intervalos RR en milisegundos.
  const rr: number[] = [];
  for (let i = 1; i < rPeakTimesSec.length; i++) {
    rr.push((rPeakTimesSec[i] - rPeakTimesSec[i - 1]) * 1000);
  }

  // BPM desde el RR medio (≥ 1 intervalo garantizado aquí).
  const meanRr = rr.reduce((a, b) => a + b, 0) / rr.length;
  const bpm = meanRr > 0 ? 60000 / meanRr : null;

  if (rr.length < 2) {
    return { bpm, sdnn: null, rmssd: null, pnn50: null };
  }

  // SDNN: desviación estándar (poblacional) de los RR.
  const variance =
    rr.reduce((acc, x) => acc + (x - meanRr) ** 2, 0) / rr.length;
  const sdnn = Math.sqrt(variance);

  // Diferencias sucesivas.
  const diffs: number[] = [];
  for (let i = 1; i < rr.length; i++) diffs.push(rr[i] - rr[i - 1]);

  const rmssd = Math.sqrt(
    diffs.reduce((acc, d) => acc + d * d, 0) / diffs.length
  );

  const over50 = diffs.filter((d) => Math.abs(d) > 50).length;
  const pnn50 = (over50 / diffs.length) * 100;

  return { bpm, sdnn, rmssd, pnn50 };
}
