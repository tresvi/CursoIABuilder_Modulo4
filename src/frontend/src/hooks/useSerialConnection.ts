import { useCallback, useRef, useState } from "react";
import type { Sample } from "../signal/signalModel";
import { toMillivolts } from "../signal/sampleScaling";
import type { SerialPortLike } from "../serial/webSerialTypes";

export type SerialConnectionStatus = "idle" | "connected" | "stopped" | "error";

/** Límite de 20 minutos a 250 Hz = 300 000 muestras válidas (FR-013). */
const SAMPLE_LIMIT = 300_000;
const SAMPLE_RATE_HZ = 250;
/** Cadencia de los lotes que se reflejan en `samples` (FR-012, ≤100 ms). */
const BATCH_MS = 100;

export interface UseSerialConnection {
  status: SerialConnectionStatus;
  reason: string | null;
  samples: Sample[];
  connect: (config: { port: SerialPortLike; baudRate: number }) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Lee el puerto serie directamente desde el navegador (Web Serial API): el
 * backend no gestiona hardware (correría en un contenedor, sin acceso al
 * puerto físico de quien usa la app). Cada línea es un entero; se descarta
 * si no lo es (FR-008) y se escala a mV (FR-006/007). Las muestras se
 * acumulan en lotes cada `BATCH_MS` para no disparar un render por línea.
 */
export function useSerialConnection(): UseSerialConnection {
  const [status, setStatus] = useState<SerialConnectionStatus>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const stoppingRef = useRef(false);
  const pendingRef = useRef<Sample[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(() => {
    if (pendingRef.current.length === 0) return;
    const batch = pendingRef.current;
    pendingRef.current = [];
    setSamples((prev) => [...prev, ...batch]);
  }, []);

  const stopFlushing = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    flush();
  }, [flush]);

  const finish = useCallback(
    (finalStatus: "stopped" | "error", finalReason: string | null) => {
      stopFlushing();
      setStatus(finalStatus);
      setReason(finalReason);
    },
    [stopFlushing]
  );

  const readLoop = useCallback(
    async (port: SerialPortLike) => {
      const reader = port.readable!.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let count = 0;

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line === "" || !/^-?\d+$/.test(line)) continue; // FR-008

            pendingRef.current.push({
              t: count / SAMPLE_RATE_HZ,
              v: toMillivolts(Number(line)),
            });
            count++;

            if (count >= SAMPLE_LIMIT) {
              stoppingRef.current = true;
              reader.cancel().catch(() => {});
              finish("stopped", "TIME_LIMIT");
              return;
            }
          }
        }
        if (!stoppingRef.current) finish("error", "DEVICE_DISCONNECTED");
      } catch {
        if (!stoppingRef.current) finish("error", "DEVICE_DISCONNECTED");
      } finally {
        reader.releaseLock();
        readerRef.current = null;
        try {
          await port.close();
        } catch {
          /* ya estaba cerrado o desconectado */
        }
      }
    },
    [finish]
  );

  const connect = useCallback(
    async (config: { port: SerialPortLike; baudRate: number }) => {
      stoppingRef.current = false;
      pendingRef.current = [];
      setSamples([]);
      setReason(null);
      await config.port.open({ baudRate: config.baudRate });
      portRef.current = config.port;
      setStatus("connected");
      flushTimerRef.current = setInterval(flush, BATCH_MS);
      void readLoop(config.port);
    },
    [flush, readLoop]
  );

  const disconnect = useCallback(async () => {
    stoppingRef.current = true;
    await readerRef.current?.cancel().catch(() => {});
    finish("stopped", null);
  }, [finish]);

  return { status, reason, samples, connect, disconnect };
}
