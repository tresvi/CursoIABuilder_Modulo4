import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSerialConnection } from "./useSerialConnection";
import type { SerialPortLike } from "../serial/webSerialTypes";

/** Puerto serie simulado: expone `push`/`endStream` para alimentar `readable`. */
class FakeSerialPort implements SerialPortLike {
  closed = false;
  openedBaudRate: number | null = null;
  readable: ReadableStream<Uint8Array>;
  private controller!: ReadableStreamDefaultController<Uint8Array>;

  constructor() {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
    });
  }

  async open(options: { baudRate: number }) {
    this.openedBaudRate = options.baudRate;
  }

  async close() {
    this.closed = true;
  }

  push(text: string) {
    this.controller.enqueue(new TextEncoder().encode(text));
  }

  endStream() {
    this.controller.close();
  }
}

describe("useSerialConnection (Web Serial API, feature 005)", () => {
  it("connect() abre el puerto con el baudRate elegido y queda 'connected'", async () => {
    const port = new FakeSerialPort();
    const { result } = renderHook(() => useSerialConnection());

    await act(async () => {
      await result.current.connect({ port, baudRate: 115200 });
    });

    expect(port.openedBaudRate).toBe(115200);
    expect(result.current.status).toBe("connected");
  });

  it("la línea '2048' produce una muestra ≈5 mV; las no numéricas se descartan sin cortar", async () => {
    const port = new FakeSerialPort();
    const { result } = renderHook(() => useSerialConnection());
    await act(async () => {
      await result.current.connect({ port, baudRate: 115200 });
    });

    act(() => port.push("basura\n2048\n"));

    await waitFor(() => expect(result.current.samples).toHaveLength(1));
    expect(result.current.samples[0].t).toBeCloseTo(0, 9);
    expect(result.current.samples[0].v).toBeCloseTo(5, 2);
    expect(result.current.status).toBe("connected");
  });

  it("disconnect() cierra el puerto y queda 'stopped' sin motivo", async () => {
    const port = new FakeSerialPort();
    const { result } = renderHook(() => useSerialConnection());
    await act(async () => {
      await result.current.connect({ port, baudRate: 115200 });
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(port.closed).toBe(true);
    expect(result.current.status).toBe("stopped");
    expect(result.current.reason).toBeNull();
  });

  it("si el stream se corta sola (dispositivo desconectado), queda 'error'", async () => {
    const port = new FakeSerialPort();
    const { result } = renderHook(() => useSerialConnection());
    await act(async () => {
      await result.current.connect({ port, baudRate: 115200 });
    });

    act(() => port.endStream());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.reason).toBe("DEVICE_DISCONNECTED");
  });

  it("al acumular 300000 muestras válidas se detiene sola (FR-013)", async () => {
    const port = new FakeSerialPort();
    const { result } = renderHook(() => useSerialConnection());
    await act(async () => {
      await result.current.connect({ port, baudRate: 115200 });
    });

    const lines = Array.from({ length: 300_000 }, () => "2048").join("\n") + "\n";
    act(() => port.push(lines));

    await waitFor(() => expect(result.current.status).toBe("stopped"), {
      timeout: 10_000,
    });
    expect(result.current.reason).toBe("TIME_LIMIT");
    expect(result.current.samples).toHaveLength(300_000);
    expect(port.closed).toBe(true);
  }, 15_000);
});
