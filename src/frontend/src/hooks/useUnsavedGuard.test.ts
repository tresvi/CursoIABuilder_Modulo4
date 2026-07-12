import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedGuard } from "./useUnsavedGuard";

/** Dispara un beforeunload cancelable y devuelve si fue prevenido. */
function fireBeforeUnload(): boolean {
  const ev = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
}

describe("useUnsavedGuard (FR-018, AC-26)", () => {
  it("previene el cierre cuando hay cambios sin guardar (dirty=true)", () => {
    renderHook(() => useUnsavedGuard(true));
    expect(fireBeforeUnload()).toBe(true);
  });

  it("no interfiere cuando no hay cambios pendientes (dirty=false)", () => {
    renderHook(() => useUnsavedGuard(false));
    expect(fireBeforeUnload()).toBe(false);
  });

  it("quita el listener al desmontar", () => {
    const { unmount } = renderHook(() => useUnsavedGuard(true));
    unmount();
    expect(fireBeforeUnload()).toBe(false);
  });
});
