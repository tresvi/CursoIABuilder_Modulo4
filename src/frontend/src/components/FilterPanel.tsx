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
}> = [
  { id: "lowpass", label: "Pasa bajo", low: false, high: true },
  { id: "highpass", label: "Pasa alto", low: true, high: false },
  { id: "bandpass", label: "Pasa banda", low: true, high: true },
  { id: "notch", label: "Notch", low: true, high: true },
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
  const [type, setType] = useState<FilterKind>("lowpass");
  const [low, setLow] = useState("0.5");
  const [high, setHigh] = useState("40");

  const kind = KINDS.find((k) => k.id === type)!;

  function submit() {
    onApply({
      type,
      cutoffLow: kind.low ? Number(low) : null,
      cutoffHigh: kind.high ? Number(high) : null,
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
            onChange={(e) => setType(e.target.value as FilterKind)}
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
