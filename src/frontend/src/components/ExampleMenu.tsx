import { useEffect, useRef, useState, type ReactNode } from "react";
import { parseCsv } from "../signal/csvParse";
import type { Signal } from "../signal/signalModel";
import { cn } from "@/lib/utils";

/** Ejemplos servidos como assets estáticos desde `public/` (ver AGENTS.md). */
export const EXAMPLES: Array<{ file: string; label: string }> = [
  { file: "ECG_20_Seg_FILTRADO.csv", label: "ECG filtrado (20 s)" },
  { file: "ECG_20_Seg_NO_FILTRADO.csv", label: "ECG sin filtrar (20 s)" },
  { file: "ECG_20_Seg_ESPANTOSO.csv", label: "ECG con mucho ruido (20 s)" },
];
const exampleUrl = (file: string) => `${import.meta.env.BASE_URL}ejemplos/${file}`;

interface TriggerArgs {
  open: boolean;
  toggle: () => void;
  loading: boolean;
}

interface Props {
  onLoad: (signal: Signal) => void;
  /** Reporta el nombre de la fuente cargada (para el encabezado). */
  onSourceName?: (name: string) => void;
  /** Render del botón que abre el menú (NavItem en la sidebar, Button en el estado vacío). */
  renderTrigger: (args: TriggerArgs) => ReactNode;
  /** Alineación horizontal del menú respecto del trigger. */
  align?: "left" | "center";
}

/**
 * Botón desplegable "Cargar ejemplo": al abrirlo muestra la lista de ECGs de
 * muestra y carga el elegido desde `public/ejemplos`. Centraliza la lógica
 * (fetch + parseo + menú + cierre al click afuera) para reusarla en la sidebar
 * y en el estado vacío del área de trabajo.
 */
export function ExampleMenu({
  onLoad,
  onSourceName,
  renderTrigger,
  align = "left",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Cerrar el desplegable al hacer click fuera de él.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  async function loadExample(file: string) {
    setError(null);
    setOpen(false);
    setLoading(true);
    try {
      const res = await fetch(exampleUrl(file));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseCsv(await res.text());
      if (!parsed.ok) {
        setError(parsed.error.message);
        return;
      }
      onLoad(parsed.signal);
      onSourceName?.(file);
    } catch {
      setError(`No se pudo cargar el ejemplo (${file}).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {renderTrigger({ open, toggle: () => setOpen((v) => !v), loading })}
      {open && (
        <ul
          role="menu"
          aria-label="Ejemplos de ECG"
          className={cn(
            "absolute top-[calc(100%+4px)] z-20 m-0 min-w-56 list-none rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          )}
        >
          {EXAMPLES.map((ex) => (
            <li key={ex.file} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => void loadExample(ex.file)}
                className="block w-full rounded px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {ex.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="error mt-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
