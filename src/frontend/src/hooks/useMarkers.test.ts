import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMarkers } from "./useMarkers";

describe("useMarkers (US6, T063)", () => {
  it("agrega, edita y elimina marcadores, notificando cada cambio", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMarkers(onChange));

    act(() => result.current.add(3.2, "artefacto"));
    expect(result.current.markers).toHaveLength(1);
    expect(result.current.markers[0].label).toBe("artefacto");

    const id = result.current.markers[0].id;
    act(() => result.current.edit(id, "arritmia"));
    expect(result.current.markers[0].label).toBe("arritmia");

    act(() => result.current.remove(id));
    expect(result.current.markers).toHaveLength(0);

    // add + edit + remove → 3 notificaciones de "dirty"
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("reset reemplaza la lista sin notificar cambios (restauración)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMarkers(onChange));
    act(() => result.current.reset([{ id: "x", time: 1, label: "a" }]));
    expect(result.current.markers).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
