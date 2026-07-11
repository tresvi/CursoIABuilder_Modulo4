import type { Sample } from "../signal/signalModel";

/**
 * Detección de picos R al estilo Pan-Tompkins simplificado (research.md D3):
 * derivada → cuadrado → integración por ventana móvil → umbral adaptativo con
 * período refractario (~200 ms). Devuelve los tiempos (s) de los picos R.
 *
 * Función pura: no muta la entrada. Pensada para operar sobre la ventana visible
 * (posiblemente filtrada) — Principio IV.
 */
export function detectRPeaks(samples: readonly Sample[], fs: number): number[] {
  const n = samples.length;
  if (fs <= 0 || n < 3) return [];

  // 1. Derivada (diferencias de primer orden).
  const deriv = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    deriv[i] = samples[i].v - samples[i - 1].v;
  }

  // 2. Cuadrado (realza los QRS y elimina el signo).
  const squared = new Float64Array(n);
  for (let i = 0; i < n; i++) squared[i] = deriv[i] * deriv[i];

  // 3. Integración por ventana móvil (~150 ms).
  const win = Math.max(1, Math.round(0.15 * fs));
  const integrated = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += squared[i];
    if (i >= win) acc -= squared[i - win];
    integrated[i] = acc / win;
  }

  // 4. Umbral adaptativo relativo al máximo de la señal integrada.
  let peakEnergy = 0;
  for (let i = 0; i < n; i++) if (integrated[i] > peakEnergy) peakEnergy = integrated[i];
  if (peakEnergy <= 0) return [];
  const threshold = 0.3 * peakEnergy;

  // 5. Barrido con período refractario: en cada región sobre el umbral, tomar el
  //    máximo de la señal ORIGINAL como localización del pico R.
  const refractory = Math.max(1, Math.round(0.2 * fs));
  const peakTimes: number[] = [];
  let i = 0;
  while (i < n) {
    if (integrated[i] > threshold) {
      let j = i;
      let bestIdx = i;
      let bestVal = samples[i].v;
      while (j < n && integrated[j] > threshold) {
        if (samples[j].v > bestVal) {
          bestVal = samples[j].v;
          bestIdx = j;
        }
        j++;
      }
      peakTimes.push(samples[bestIdx].t);
      i = Math.max(j, bestIdx + refractory);
    } else {
      i++;
    }
  }

  return peakTimes;
}
