import { useCallback, useRef, useState } from "react";
import { connectSerial, disconnectSerial, serialStreamUrl } from "../api/serialApi";
import type { Sample } from "../signal/signalModel";

export type SerialConnectionStatus = "idle" | "connected" | "stopped" | "error";

interface StreamEvent {
  samples: Sample[];
  status: SerialConnectionStatus;
  reason: string | null;
}

/** Superficie mínima de un EventSource — permite inyectar uno falso en tests
 * sin depender de que jsdom implemente `EventSource` de verdad. */
export interface EventSourceLike {
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close(): void;
}

function createDefaultEventSource(url: string): EventSourceLike {
  return new EventSource(url) as unknown as EventSourceLike;
}

interface UseSerialConnectionOptions {
  createEventSource?: (url: string) => EventSourceLike;
}

export interface UseSerialConnection {
  status: SerialConnectionStatus;
  reason: string | null;
  samples: Sample[];
  connect: (config: { port: string; baudRate: number }) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Conecta al backend por SSE (research.md D2/D3) y acumula las muestras
 * entrantes ya escaladas a mV. Análogo al patrón de Worker inyectable de la
 * feature 003 (`ComplexDetectionWorkerLike`): el stream es reemplazable en
 * tests vía `createEventSource`.
 */
export function useSerialConnection(
  options: UseSerialConnectionOptions = {}
): UseSerialConnection {
  const createEventSource = options.createEventSource ?? createDefaultEventSource;
  const [status, setStatus] = useState<SerialConnectionStatus>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const sourceRef = useRef<EventSourceLike | null>(null);

  const connect = useCallback(
    async (config: { port: string; baudRate: number }) => {
      await connectSerial(config.port, config.baudRate);
      setSamples([]);
      setReason(null);
      setStatus("connected");

      const source = createEventSource(serialStreamUrl());
      sourceRef.current = source;
      source.onmessage = (event) => {
        const data: StreamEvent = JSON.parse(event.data);
        if (data.samples.length > 0) {
          setSamples((prev) => [...prev, ...data.samples]);
        }
        setStatus(data.status);
        setReason(data.reason);
        if (data.status !== "connected") {
          source.close();
          sourceRef.current = null;
        }
      };
      source.onerror = () => {
        setStatus("error");
        source.close();
        sourceRef.current = null;
      };
    },
    [createEventSource]
  );

  const disconnect = useCallback(async () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    await disconnectSerial();
  }, []);

  return { status, reason, samples, connect, disconnect };
}
