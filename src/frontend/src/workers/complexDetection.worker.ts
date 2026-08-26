import type { Sample } from "../signal/signalModel";
import { detectComplexes } from "../metrics/complexDetection";

/**
 * Entry point del Web Worker (research.md D2): recibe la señal completa y
 * responde con el `ComplexDetectionResult`, sin bloquear el hilo principal.
 * Glue mínimo — la lógica real vive en `detectComplexes` (ya probada).
 */
export interface ComplexDetectionRequest {
  samples: readonly Sample[];
  fs: number;
  durationSec: number;
}

self.onmessage = (event: MessageEvent<ComplexDetectionRequest>) => {
  const { samples, fs, durationSec } = event.data;
  const result = detectComplexes({ samples, fs, durationSec });
  self.postMessage(result);
};
