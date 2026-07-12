import type { Signal } from "./signalModel";

/**
 * Serializa la señal a texto CSV con encabezado `tiempo,mV` y una fila por
 * muestra. El formato es compatible con `parseCsv` (separador coma), así que el
 * archivo descargado se puede volver a cargar en el ECGViewer.
 */
export function toCsv(signal: Signal): string {
  const rows = ["tiempo,mV"];
  for (const s of signal.samples) rows.push(`${s.t},${s.v}`);
  return rows.join("\n") + "\n";
}

/**
 * Genera un CSV con la señal actual y dispara la descarga en el navegador
 * (US: "Guardar como CSV"). Todo ocurre en el cliente; no usa el backend.
 */
export function downloadCsv(signal: Signal, fileName = "ecg.csv"): void {
  const blob = new Blob([toCsv(signal)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
