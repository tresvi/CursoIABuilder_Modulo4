import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTool, cursorForTool } from "./useTool";

describe("cursorForTool (cursor propio por herramienta)", () => {
  it("mapea cada herramienta a su cursor (lupa, regla, tijera, cruz)", () => {
    expect(cursorForTool("zoom")).toContain("zoom-in");
    expect(cursorForTool("pan")).toBe("grab");
    expect(cursorForTool("ruler")).toBe("crosshair");
    expect(cursorForTool("crop")).toBe("crosshair");
    // "Marcar" usa una cruz fina propia (SVG) con hotspot centrado y fallback.
    expect(cursorForTool("marker")).toContain("data:image/svg+xml");
    expect(cursorForTool("marker")).toContain("12 12, crosshair");
    expect(cursorForTool("none")).toBe("default");
  });
});

describe("useTool", () => {
  it("empieza en 'none' y cambia la herramienta activa", () => {
    const { result } = renderHook(() => useTool());
    expect(result.current.tool).toBe("none");
    act(() => result.current.setTool("zoom"));
    expect(result.current.tool).toBe("zoom");
    expect(result.current.cursor).toContain("zoom-in");
  });

  it("alterna a 'none' si se selecciona la misma herramienta activa", () => {
    const { result } = renderHook(() => useTool());
    act(() => result.current.setTool("ruler"));
    expect(result.current.tool).toBe("ruler");
    act(() => result.current.setTool("ruler"));
    expect(result.current.tool).toBe("none");
  });
});
