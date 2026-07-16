import { useEffect, useRef, useState } from "react";
import { FolderOpen, LineChart } from "lucide-react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";
import { NavItem } from "./layout/NavItem";

interface Props {
  onLoad: (signal: Signal) => void;
  /** Reporta el nombre de la fuente cargada (archivo o ejemplo) para el encabezado. */
  onSourceName?: (name: string) => void;
  /** Sidebar colapsada: muestra solo íconos (con tooltip nativo). */
  collapsed?: boolean;
}

/** Ejemplos servidos como assets estáticos desde `public/` (ver AGENTS.md). */
const EXAMPLES: Array<{ file: string; label: string }> = [
  { file: "ECG_20_Seg_FILTRADO.csv", label: "ECG filtrado (20 s)" },
  { file: "ECG_20_Seg_NO_FILTRADO.csv", label: "ECG sin filtrar (20 s)" },
  { file: "ECG_20_Seg_ESPANTOSO.csv", label: "ECG con mucho ruido (20 s)" },
];
const exampleUrl = (file: string) => `${import.meta.env.BASE_URL}ejemplos/${file}`;

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
 * selector nativo (oculto) y "Cargar ejemplo" despliega la lista de ECGs demo.
 */
export function FileLoader({ onLoad, onSourceName, collapsed = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cerrar el desplegable al hacer click fuera de él.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuOpen]);

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

  async function handleLoadExample(file: string) {
    setError(null);
    setMenuOpen(false);
    setLoadingExample(true);
    try {
      const res = await fetch(exampleUrl(file));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (loadFromText(await res.text())) onSourceName?.(file);
    } catch {
      setError(`No se pudo cargar el ejemplo (${file}).`);
    } finally {
      setLoadingExample(false);
    }
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
      <div ref={menuRef} className="relative">
        <NavItem
          icon={LineChart}
          label={loadingExample ? "Cargando…" : "Cargar ejemplo"}
          collapsed={collapsed}
          onClick={() => setMenuOpen((v) => !v)}
          disabled={loadingExample}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Elegí un ECG de ejemplo para cargar"
        />
        {menuOpen && (
          <ul
            role="menu"
            aria-label="Ejemplos de ECG"
            className="absolute left-0 top-[calc(100%+4px)] z-20 m-0 min-w-56 list-none rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {EXAMPLES.map((ex) => (
              <li key={ex.file} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLoadExample(ex.file)}
                  className="block w-full rounded px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {ex.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="error px-3 py-1 text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
