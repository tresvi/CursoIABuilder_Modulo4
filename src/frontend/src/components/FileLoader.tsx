import { useState } from "react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";

interface Props {
  onLoad: (signal: Signal) => void;
}

/** Ejemplo servido como asset estático desde `public/` (ver AGENTS.md). */
const EXAMPLE_URL = `${import.meta.env.BASE_URL}ejemplos/ECG_20_Seg_FILTRADO.csv`;
const EXAMPLE_NAME = "ECG_20_Seg_FILTRADO.csv";

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
 * Además del selector de archivo ofrece "Cargar ejemplo", que trae un ECG de
 * muestra sin que el usuario tenga que copiar archivos a su PC.
 * El nombre del archivo lo muestra el propio control nativo de archivo.
 */
export function FileLoader({ onLoad }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);

  function loadFromText(text: string): boolean {
    const res = parseCsv(text);
    if (!res.ok) {
      setError(res.error.message);
      return false;
    }
    onLoad(res.signal);
    return true;
  }

  async function handleFile(file: File) {
    setError(null);
    const text = await readFileText(file);
    loadFromText(text);
  }

  async function handleLoadExample() {
    setError(null);
    setLoadingExample(true);
    try {
      const res = await fetch(EXAMPLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadFromText(await res.text());
    } catch {
      setError(`No se pudo cargar el ejemplo (${EXAMPLE_NAME}).`);
    } finally {
      setLoadingExample(false);
    }
  }

  return (
    <div
      className="file-loader"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Cargar archivo CSV de ECG"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => void handleLoadExample()}
        disabled={loadingExample}
        title={`Cargar el ECG de ejemplo (${EXAMPLE_NAME})`}
        style={{
          fontWeight: 700,
          color: "#fff",
          background: "#1565c0",
          border: "none",
          borderRadius: 6,
          padding: "6px 14px",
          cursor: loadingExample ? "default" : "pointer",
          opacity: loadingExample ? 0.7 : 1,
        }}
      >
        {loadingExample ? "Cargando…" : "📈 Cargar ejemplo"}
      </button>
      {error && (
        <p role="alert" className="error" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}
    </div>
  );
}
