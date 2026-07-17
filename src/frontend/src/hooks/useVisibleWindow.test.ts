import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  fullWindow,
  panWindow,
  useVisibleWindow,
  type VisibleWindow,
} from "./useVisibleWindow";
import { createSignal, type Signal } from "../signal/signalModel";

const full: VisibleWindow = { fromTime: 0, toTime: 60 };

/** Señal sintética de `n` muestras a `fs` Hz (rango temporal 0…(n-1)/fs). */
function signalOf(n: number, fs = 250): Signal {
  return createSignal(
    Array.from({ length: n }, (_, i) => ({ t: i / fs, v: Math.sin(i) }))
  );
}

describe("panWindow (desplazamiento horizontal, recalcula métricas al mover, FR-023)", () => {
  it("desplaza la ventana conservando su ancho", () => {
    const w = { fromTime: 10, toTime: 20 };
    expect(panWindow(w, 5, full)).toEqual({ fromTime: 15, toTime: 25 });
    expect(panWindow(w, -5, full)).toEqual({ fromTime: 5, toTime: 15 });
  });

  it("hace clamp al inicio de la señal (no se pasa por la izquierda)", () => {
    const w = { fromTime: 3, toTime: 13 };
    expect(panWindow(w, -10, full)).toEqual({ fromTime: 0, toTime: 10 });
  });

  it("hace clamp al final de la señal (no se pasa por la derecha)", () => {
    const w = { fromTime: 45, toTime: 55 };
    expect(panWindow(w, 20, full)).toEqual({ fromTime: 50, toTime: 60 });
  });

  it("si la ventana ya abarca toda la señal, no hay nada que desplazar", () => {
    expect(panWindow({ fromTime: 0, toTime: 60 }, 5, full)).toEqual(full);
  });
});

describe("useVisibleWindow — reinicio de la ventana", () => {
  it("conserva el zoom al filtrar (mismo loadKey, otra señal con igual rango)", () => {
    const key = {}; // misma señal original (no se recargó)
    const sig = signalOf(1000);
    const { result, rerender } = renderHook(
      ({ s, k }) => useVisibleWindow(s, k),
      { initialProps: { s: sig, k: key } }
    );
    act(() => result.current.zoomTo(1, 2));
    expect(result.current.window).toEqual({ fromTime: 1, toTime: 2 });

    // Filtrar = nueva Signal (mismo eje temporal) pero MISMO loadKey → no resetea.
    rerender({ s: signalOf(1000), k: key });
    expect(result.current.window).toEqual({ fromTime: 1, toTime: 2 });
  });

  it("al cargar un ensayo > 20 s muestra solo los primeros 20 s", () => {
    const short = signalOf(1000); // 0 … 3.996 s
    const { result, rerender } = renderHook(
      ({ s, k }) => useVisibleWindow(s, k),
      { initialProps: { s: short, k: {} } }
    );
    act(() => result.current.zoomTo(1, 2));

    const long = signalOf(6000); // 0 … 23.996 s, nuevo loadKey
    rerender({ s: long, k: {} });
    expect(result.current.window).toEqual({ fromTime: 0, toTime: 20 });
  });

  it("al cargar un ensayo <= 20 s muestra el ensayo completo", () => {
    const sig = signalOf(1000);
    const { result } = renderHook(({ s, k }) => useVisibleWindow(s, k), {
      initialProps: { s: sig, k: {} },
    });
    expect(result.current.window).toEqual(fullWindow(sig));
  });

  it("al recortar (mismo loadKey, cambia el rango) muestra el rango recortado", () => {
    const key = {};
    const sig = signalOf(6000); // arranca en [0, 20]
    const { result, rerender } = renderHook(
      ({ s, k }) => useVisibleWindow(s, k),
      { initialProps: { s: sig, k: key } }
    );
    // Recorte: mismo loadKey, señal con otro rango temporal.
    const cropped = createSignal(
      Array.from({ length: 500 }, (_, i) => ({ t: 2 + i / 250, v: 0 }))
    );
    rerender({ s: cropped, k: key });
    expect(result.current.window).toEqual({
      fromTime: 2,
      toTime: 2 + 499 / 250,
    });
  });

  it("Restablecer zoom vuelve a la señal completa aunque supere 20 s (AC-09)", () => {
    const sig = signalOf(6000);
    const { result } = renderHook(({ s, k }) => useVisibleWindow(s, k), {
      initialProps: { s: sig, k: {} },
    });
    expect(result.current.window).toEqual({ fromTime: 0, toTime: 20 });
    act(() => result.current.reset());
    expect(result.current.window).toEqual(fullWindow(sig));
  });
});
