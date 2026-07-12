import { describe, it, expect } from "vitest";
import { toCsv } from "./csvExport";
import { parseCsv } from "./csvParse";
import { createSignal } from "./signalModel";

describe("csvExport", () => {
  it("genera encabezado y una fila por muestra", () => {
    const sig = createSignal([
      { t: 0, v: 0.1 },
      { t: 0.004, v: -0.2 },
    ]);
    const csv = toCsv(sig);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("tiempo,mV");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("0,0.1");
  });

  it("hace round-trip con parseCsv (el archivo descargado se puede recargar)", () => {
    const samples = [
      { t: 0, v: 0.12 },
      { t: 0.004, v: 0.15 },
      { t: 0.008, v: -0.03 },
    ];
    const csv = toCsv(createSignal(samples));
    const res = parseCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.signal.samples).toEqual(samples);
  });
});
