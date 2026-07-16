import { useEffect, useState } from "react";
import type { FilterConfig, FilterKind } from "../api/filterApi";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface Props {
  disabled: boolean;
  hasFilter: boolean;
  busy: boolean;
  error: string | null;
  /** Tipo de filtro seleccionado (controlado por MainPage / sidebar). */
  type: FilterKind;
  onTypeChange: (type: FilterKind) => void;
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
  type,
  onTypeChange,
  onApply,
  onRevert,
}: Props) {
  const [low, setLow] = useState("1");
  const [high, setHigh] = useState("49.5");
  const [winSize, setWinSize] = useState("7");
  const [poly, setPoly] = useState("3");

  const kind = KINDS.find((k) => k.id === type)!;

  // Al cambiar el tipo (desde el select o la sidebar), sugiere la ventana por defecto.
  useEffect(() => {
    const def = KINDS.find((k) => k.id === type)?.defWindow;
    if (def != null) setWinSize(String(def));
  }, [type]);

  function submit() {
    onApply({
      type,
      cutoffLow: kind.low ? Number(low) : null,
      cutoffHigh: kind.high ? Number(high) : null,
      window: kind.window ? Number(winSize) : null,
      polyOrder: kind.poly ? Number(poly) : null,
    });
  }

  const field = "flex flex-col gap-1 text-sm";

  return (
    <Card className="p-4" data-testid="filter-panel">
      <h3 className="mb-3 text-base font-semibold">Filtro digital</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className={field}>
          Tipo
          <Select
            aria-label="Tipo de filtro"
            value={type}
            onChange={(e) => onTypeChange(e.target.value as FilterKind)}
            disabled={disabled}
            className="w-40"
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </Select>
        </label>
        {kind.low && (
          <label className={field}>
            Corte inf. (Hz)
            <Input
              aria-label="Corte inferior"
              type="number"
              value={low}
              min={0}
              step="0.1"
              onChange={(e) => setLow(e.target.value)}
              disabled={disabled}
              className="w-28"
            />
          </label>
        )}
        {kind.high && (
          <label className={field}>
            Corte sup. (Hz)
            <Input
              aria-label="Corte superior"
              type="number"
              value={high}
              min={0}
              step="0.1"
              onChange={(e) => setHigh(e.target.value)}
              disabled={disabled}
              className="w-28"
            />
          </label>
        )}
        {kind.window && (
          <label className={field}>
            Ventana (muestras)
            <Input
              aria-label="Ventana"
              type="number"
              value={winSize}
              min={2}
              step={kind.poly ? 2 : 1}
              onChange={(e) => setWinSize(e.target.value)}
              disabled={disabled}
              className="w-32"
            />
          </label>
        )}
        {kind.poly && (
          <label className={field}>
            Grado polinomio
            <Input
              aria-label="Grado del polinomio"
              type="number"
              value={poly}
              min={1}
              step={1}
              onChange={(e) => setPoly(e.target.value)}
              disabled={disabled}
              className="w-28"
            />
          </label>
        )}
        <Button onClick={submit} disabled={disabled || busy}>
          {busy ? "Aplicando…" : "Aplicar filtro"}
        </Button>
        <Button
          variant="outline"
          onClick={onRevert}
          disabled={disabled || !hasFilter}
        >
          Revertir
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}
