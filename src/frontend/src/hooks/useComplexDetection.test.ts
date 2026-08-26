import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useComplexDetection,
  type ComplexDetectionWorkerLike,
} from "./useComplexDetection";
import type { Signal } from "../signal/signalModel";
import type { ComplexDetectionResult } from "../metrics/complexDetection";

function fakeSignal(): Signal {
  return { samples: [{ t: 0, v: 0 }], fs: 250, durationSec: 0 };
}

/** Worker falso: resuelve de forma async (microtask), como un Worker real. */
class FakeWorker implements ComplexDetectionWorkerLike {
  onmessage: ((event: MessageEvent<ComplexDetectionResult>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn(() => {
    queueMicrotask(() => {
      this.onmessage?.({
        data: { complexes: [], lowConfidenceRanges: [] },
      } as unknown as MessageEvent<ComplexDetectionResult>);
    });
  });
}

describe("useComplexDetection (research.md D2)", () => {
  it("pasa por 'processing' y termina en 'ready' con el resultado del worker", async () => {
    let worker: FakeWorker | undefined;
    const { result } = renderHook(() =>
      useComplexDetection(() => (worker = new FakeWorker()))
    );

    expect(result.current.status).toBe("idle");

    act(() => {
      result.current.run(fakeSignal());
    });
    expect(result.current.status).toBe("processing");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.result).toEqual({ complexes: [], lowConfidenceRanges: [] });
    expect(worker?.terminate).toHaveBeenCalled();
  });

  it("reset() vuelve a 'idle', limpia el resultado y termina el worker en curso", () => {
    const worker = new FakeWorker();
    const { result } = renderHook(() => useComplexDetection(() => worker));

    act(() => result.current.run(fakeSignal()));
    act(() => result.current.reset());

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("al desmontar, termina el worker en curso", () => {
    const worker = new FakeWorker();
    const { result, unmount } = renderHook(() => useComplexDetection(() => worker));

    act(() => result.current.run(fakeSignal()));
    unmount();

    expect(worker.terminate).toHaveBeenCalled();
  });

  it("sin Worker disponible (jsdom), usa un fallback inline y llega igual a 'ready'", async () => {
    // Sin factory inyectada: usa el default, que en este entorno (sin
    // `Worker` global) cae al fallback inline.
    expect(typeof Worker).toBe("undefined");
    const { result } = renderHook(() => useComplexDetection());

    act(() => result.current.run(fakeSignal()));
    expect(result.current.status).toBe("processing");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.result).toEqual({ complexes: [], lowConfidenceRanges: [] });
  });

  it("una corrida nueva reemplaza (termina) el worker de la corrida anterior", async () => {
    const workers: FakeWorker[] = [];
    const { result } = renderHook(() =>
      useComplexDetection(() => {
        const w = new FakeWorker();
        workers.push(w);
        return w;
      })
    );

    act(() => result.current.run(fakeSignal()));
    act(() => result.current.run(fakeSignal()));

    expect(workers).toHaveLength(2);
    expect(workers[0].terminate).toHaveBeenCalled();

    // Deja resolver el microtask del worker vigente (segundo) para no dejar
    // una actualización de estado pendiente fuera de act().
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
