import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as serialApi from "../api/serialApi";
import { useSerialConnection, type EventSourceLike } from "./useSerialConnection";

/** Fuente SSE simulada e inyectable (análoga al Worker inyectable de la feature 003). */
class FakeEventSource implements EventSourceLike {
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  close() {
    this.closed = true;
  }
}

describe("useSerialConnection (US2)", () => {
  let fakeSource: FakeEventSource;

  beforeEach(() => {
    fakeSource = new FakeEventSource();
    vi.spyOn(serialApi, "connectSerial").mockResolvedValue(undefined);
    vi.spyOn(serialApi, "disconnectSerial").mockResolvedValue(undefined);
  });

  function setup() {
    return renderHook(() =>
      useSerialConnection({ createEventSource: () => fakeSource })
    );
  }

  it("connect() llama a POST /connect y luego consume el stream", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.connect({ port: "COM3", baudRate: 115200 });
    });
    expect(serialApi.connectSerial).toHaveBeenCalledWith("COM3", 115200);
    expect(result.current.status).toBe("connected");
  });

  it("cada evento recibido se acumula en el arreglo de muestras", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.connect({ port: "COM3", baudRate: 115200 });
    });

    act(() => {
      fakeSource.emit({
        samples: [{ t: 0, v: 5 }],
        status: "connected",
        reason: null,
      });
    });
    await waitFor(() => expect(result.current.samples).toHaveLength(1));

    act(() => {
      fakeSource.emit({
        samples: [{ t: 0.004, v: 0 }],
        status: "connected",
        reason: null,
      });
    });
    await waitFor(() => expect(result.current.samples).toHaveLength(2));
  });

  it("un evento con status:'stopped' cierra el consumo y expone el motivo", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.connect({ port: "COM3", baudRate: 115200 });
    });

    act(() => {
      fakeSource.emit({ samples: [], status: "stopped", reason: "TIME_LIMIT" });
    });

    await waitFor(() => expect(result.current.status).toBe("stopped"));
    expect(result.current.reason).toBe("TIME_LIMIT");
    expect(fakeSource.closed).toBe(true);
  });
});
