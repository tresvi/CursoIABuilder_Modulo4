import { describe, it, expect } from "vitest";
import {
  addMarker,
  editMarker,
  removeMarker,
  type EventMarker,
} from "./markers";

describe("markers (FR-011/012/013, AC-05/06/07)", () => {
  it("crea un marcador anclado a un instante del eje temporal", () => {
    const list = addMarker([], 3.2, "artefacto");
    expect(list).toHaveLength(1);
    expect(list[0].time).toBe(3.2);
    expect(list[0].label).toBe("artefacto");
    expect(list[0].id).toBeTruthy();
  });

  it("no muta la lista original (inmutable)", () => {
    const a: EventMarker[] = [];
    const b = addMarker(a, 1);
    expect(a).toHaveLength(0);
    expect(b).toHaveLength(1);
  });

  it("edita la etiqueta de un marcador existente", () => {
    const list = addMarker([], 1, "x");
    const edited = editMarker(list, list[0].id, "arritmia");
    expect(edited[0].label).toBe("arritmia");
  });

  it("elimina un marcador existente", () => {
    let list = addMarker([], 1, "a");
    list = addMarker(list, 2, "b");
    const after = removeMarker(list, list[0].id);
    expect(after).toHaveLength(1);
    expect(after[0].label).toBe("b");
  });
});
