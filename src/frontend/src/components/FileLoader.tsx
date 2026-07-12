import { useEffect, useRef, useState } from "react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";

interface Props {
  onLoad: (signal: Signal) => void;
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
 * Junto al selector de archivo ofrece "Cargar ejemplo": un botón desplegable
 * con la lista de ECGs de muestra, para probar la app sin copiar archivos.
 */
export function FileLoader({ onLoad }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    loadFromText(text);
  }

  async function handleLoadExample(file: string) {
    setError(null);
    setMenuOpen(false);
    setLoadingExample(true);
    try {
      const res = await fetch(exampleUrl(file));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadFromText(await res.text());
    } catch {
      setError(`No se pudo cargar el ejemplo (${file}).`);
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
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={loadingExample}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Elegí un ECG de ejemplo para cargar"
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
          {loadingExample ? "Cargando…" : "📈 Cargar ejemplo ▾"}
        </button>
        {menuOpen && (
          <ul
            role="menu"
            aria-label="Ejemplos de ECG"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 10,
              margin: 0,
              padding: 4,
              listStyle: "none",
              minWidth: 220,
              background: "#fff",
              border: "1px solid #ccc",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {EXAMPLES.map((ex) => (
              <li key={ex.file} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLoadExample(ex.file)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 10px",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#eef3fb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {ex.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p role="alert" className="error" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}
    </div>
  );
}
