import { useRef, useState } from "react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";

interface Props {
  onLoad: (signal: Signal) => void;
}

/** Lee el texto de un File de forma compatible con navegador y entorno de test. */
function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Carga de archivo CSV monocanal (US1). Valida el formato y, ante error o
 * multicanal, muestra un mensaje y NO carga la señal (AC-02/03, SC-007).
 */
export function FileLoader({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const text = await readFileText(file);
    const res = parseCsv(text);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onLoad(res.signal);
  }

  return (
    <div className="file-loader">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Cargar archivo CSV de ECG"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {fileName && !error && (
        <span className="file-name"> {fileName}</span>
      )}
      {error && (
        <p role="alert" className="error" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}
    </div>
  );
}
