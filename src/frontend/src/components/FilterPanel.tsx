import { useState } from "react";
import type { FilterConfig, FilterKind } from "../api/filterApi";

interface Props {
  disabled: boolean;
  hasFilter: boolean;
  busy: boolean;
  error: string | null;
  onApply: (config: FilterConfig) => void;
  onRevert: () => void;
}

const KINDS: Array<{
  id: FilterKind;
  label: string;
  low: boolean;
  high: boolean;
  window: boolean;
  poly: boolean;
  /** Ventana recomendada (muestras) al seleccionar el filtro. */
  defWindow?: number;
}> = [
  { id: "lowpass", label: "Pasa bajo", low: false, high: true, window: false, poly: false },
  { id: "highpass", label: "Pasa alto", low: true, high: false, window: false, poly: false },
  { id: "bandpass", label: "Pasa banda", low: true, high: true, window: false, poly: false },
  { id: "notch", label: "Notch", low: true, high: true, window: false, poly: false },
  // Filtros en el dominio del tiempo (experimentales): ventana en muestras.
  { id: "movingaverage", label: "Media móvil", low: false, high: false, window: true, poly: false, defWindow: 5 }, // prettier-ignore
  { id: "median", label: "Mediana móvil", low: false, high: false, window: true, poly: false, defWindow: 7 }, // prettier-ignore
  { id: "savgol", label: "Savitzky–Golay", low: false, high: false, window: true, poly: true, defWindow: 11 }, // prettier-ignore
];

/** Panel de filtro digital (US4, AC-14/15): tipo, cortes, aplicar y revertir. */
export function FilterPanel({
  disabled,
  hasFilter,
  busy,
  error,
  onApply,
  onRevert,
}: Props) {
  const [type, setType] = useState<FilterKind>("bandpass");
  const [low, setLow] = useState("1");
  const [high, setHigh] = useState("49.5");
  const [winSize, setWinSize] = useState("7");
  const [poly, setPoly] = useState("3");

  const kind = KINDS.find((k) => k.id === type)!;

  function changeType(next: FilterKind) {
    setType(next);
    const def = KINDS.find((k) => k.id === next)?.defWindow;
    if (def != null) setWinSize(String(def));
  }

  function submit() {
    onApply({
      type,
      cutoffLow: kind.low ? Number(low) : null,
      cutoffHigh: kind.high ? Number(high) : null,
      window: kind.window ? Number(winSize) : null,
      polyOrder: kind.poly ? Number(poly) : null,
    });
  }

  return (
    <section className="filter-panel" data-testid="filter-panel">
      <h3>Filtro digital</h3>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}
      >
        <label>
          Tipo
          <br />
          <select
            aria-label="Tipo de filtro"
            value={type}
            onChange={(e) => changeType(e.target.value as FilterKind)}
            disabled={disabled}
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind.low && (
          <label>
            Corte inf. (Hz)
            <br />
            <input
              aria-label="Corte inferior"
              type="number"
              value={low}
              min={0}
              step="0.1"
              onChange={(e) => setLow(e.target.value)}
              disabled={disabled}
              style={{ width: 90 }}
            />
          </label>
        )}
        {kind.high && (
          <label>
            Corte sup. (Hz)
            <br />
            <input
              aria-label="Corte superior"
              type="number"
              value={high}
              min={0}
              step="0.1"
              onChange={(e) => setHigh(e.target.value)}
              disabled={disabled}
              style={{ width: 90 }}
            />
          </label>
        )}
        {kind.window && (
          <label>
            Ventana (muestras)
            <br />
            <input
              aria-label="Ventana"
              type="number"
              value={winSize}
              min={2}
              step={kind.poly ? 2 : 1}
              onChange={(e) => setWinSize(e.target.value)}
              disabled={disabled}
              style={{ width: 110 }}
            />
          </label>
        )}
        {kind.poly && (
          <label>
            Grado polinomio
            <br />
            <input
              aria-label="Grado del polinomio"
              type="number"
              value={poly}
              min={1}
              step={1}
              onChange={(e) => setPoly(e.target.value)}
              disabled={disabled}
              style={{ width: 90 }}
            />
          </label>
        )}
        <button onClick={submit} disabled={disabled || busy}>
          {busy ? "Aplicando…" : "Aplicar filtro"}
        </button>
        <button onClick={onRevert} disabled={disabled || !hasFilter}>
          Revertir
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: "#c62828" }}>
          {error}
        </p>
      )}
    </section>
  );
}
