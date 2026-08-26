import { useCallback, useEffect, useRef, useState } from "react";
import type { Signal } from "../signal/signalModel";
import { detectComplexes, type ComplexDetectionResult } from "../metrics/complexDetection";
import type { ComplexDetectionRequest } from "../workers/complexDetection.worker";

export type ComplexDetectionStatus = "idle" | "processing" | "ready";

/** Superficie mínima de un Worker que la hook necesita — permite inyectar uno
 * falso en tests sin depender de que jsdom implemente Worker de verdad. */
export interface ComplexDetectionWorkerLike {
  postMessage(request: ComplexDetectionRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<ComplexDetectionResult>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** Fallback cuando `Worker` no está disponible en el entorno (p. ej. jsdom en
 * tests, o un navegador/webview restringido): corre `detectComplexes` igual
 * en un microtask, preservando la misma forma async (idle→processing→ready)
 * sin bloquear de forma síncrona a quien llama `run()`. */
class InlineComplexDetectionWorker implements ComplexDetectionWorkerLike {
  onmessage: ((event: MessageEvent<ComplexDetectionResult>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(request: ComplexDetectionRequest): void {
    queueMicrotask(() => {
      try {
        const result = detectComplexes(request);
        this.onmessage?.({ data: result } as unknown as MessageEvent<ComplexDetectionResult>);
      } catch {
        this.onerror?.({} as ErrorEvent);
      }
    });
  }

  terminate(): void {
    // Nada que cancelar: el cálculo corre en el mismo hilo de forma inmediata.
  }
}

function createDefaultWorker(): ComplexDetectionWorkerLike {
  if (typeof Worker === "undefined") {
    return new InlineComplexDetectionWorker();
  }
  return new Worker(new URL("../workers/complexDetection.worker.ts", import.meta.url), {
    type: "module",
  });
}

export interface UseComplexDetection {
  status: ComplexDetectionStatus;
  result: ComplexDetectionResult | null;
  /** Dispara (o reemplaza) una corrida de detección sobre `signal` completa. */
  run: (signal: Signal) => void;
  /** Descarta cualquier corrida en curso y vuelve a 'idle' sin resultado. */
  reset: () => void;
}

/**
 * Corre `detectComplexes` en un Web Worker (research.md D2) para no bloquear
 * el hilo principal, exponiendo el ciclo `idle → processing → ready` de
 * data-model.md. Cada `run()` reemplaza (termina) cualquier corrida anterior.
 */
export function useComplexDetection(
  createWorker: () => ComplexDetectionWorkerLike = createDefaultWorker
): UseComplexDetection {
  const [status, setStatus] = useState<ComplexDetectionStatus>("idle");
  const [result, setResult] = useState<ComplexDetectionResult | null>(null);
  const workerRef = useRef<ComplexDetectionWorkerLike | null>(null);

  const terminateCurrent = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const run = useCallback(
    (signal: Signal) => {
      terminateCurrent();
      setStatus("processing");
      setResult(null);

      const worker = createWorker();
      workerRef.current = worker;
      // Guarda contra un worker reemplazado/terminado que igual llega a
      // disparar un callback tardío (p. ej. mensaje en vuelo al momento del
      // terminate): solo se aplica si sigue siendo el worker vigente.
      worker.onmessage = (event) => {
        if (workerRef.current !== worker) return;
        setResult(event.data);
        setStatus("ready");
        terminateCurrent();
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        setResult(null);
        setStatus("idle");
        terminateCurrent();
      };
      worker.postMessage({
        samples: signal.samples,
        fs: signal.fs,
        durationSec: signal.durationSec,
      });
    },
    [createWorker, terminateCurrent]
  );

  const reset = useCallback(() => {
    terminateCurrent();
    setStatus("idle");
    setResult(null);
  }, [terminateCurrent]);

  useEffect(() => terminateCurrent, [terminateCurrent]);

  return { status, result, run, reset };
}
