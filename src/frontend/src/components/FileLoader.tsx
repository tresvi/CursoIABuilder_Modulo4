import { useRef, useState } from "react";
import { FolderOpen, LineChart } from "lucide-react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";
import { NavItem } from "./layout/NavItem";
import { ExampleMenu } from "./ExampleMenu";

interface Props {
  onLoad: (signal: Signal) => void;
  /** Reporta el nombre de la fuente cargada (archivo o ejemplo) para el encabezado. */
  onSourceName?: (name: string) => void;
  /** Sidebar colapsada: muestra solo íconos (con tooltip nativo). */
  collapsed?: boolean;
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
 * Se integra en el grupo "Archivo" de la sidebar: "Abrir CSV" dispara el
 * selector nativo (oculto) y "Cargar ejemplo" (ExampleMenu) despliega la lista
 * de ECGs demo.
 */
export function FileLoader({ onLoad, onSourceName, collapsed = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (loadFromText(text)) onSourceName?.(file.name);
  }

  return (
    <div className="file-loader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Cargar archivo CSV de ECG"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <NavItem
        icon={FolderOpen}
        label="Abrir CSV"
        collapsed={collapsed}
        onClick={() => fileInputRef.current?.click()}
      />
      <ExampleMenu
        onLoad={onLoad}
        onSourceName={onSourceName}
        renderTrigger={({ open, toggle, loading }) => (
          <NavItem
            icon={LineChart}
            label={loading ? "Cargando…" : "Cargar ejemplo"}
            collapsed={collapsed}
            onClick={toggle}
            disabled={loading}
            aria-haspopup="menu"
            aria-expanded={open}
            title="Elegí un ECG de ejemplo para cargar"
          />
        )}
      />
      {error && (
        <p role="alert" className="error px-3 py-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
