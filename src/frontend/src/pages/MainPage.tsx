import { useMemo, useState } from "react";
import { FileLoader } from "../components/FileLoader";
import { ECGChart } from "../components/ECGChart";
import { MetricsPanel } from "../components/MetricsPanel";
import { MarkerEditor } from "../components/MarkerEditor";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FilterPanel } from "../components/FilterPanel";
import { useAppState } from "../hooks/useAppState";
import { useVisibleWindow } from "../hooks/useVisibleWindow";
import { useTool, type Tool } from "../hooks/useTool";
import { useMarkers } from "../hooks/useMarkers";
import { useUnsavedGuard } from "../hooks/useUnsavedGuard";
import { metricsForWindow } from "../metrics/windowMetrics";
import {
  applyCrop,
  applyFilter as applyFilterModel,
  revertFilter,
  deriveWorking,
  initDerivation,
  type CropRange,
  type Derivation,
  type Signal,
} from "../signal/signalModel";
import {
  applyFilter as applyFilterApi,
  type FilterConfig,
} from "../api/filterApi";
import { ApiRequestError } from "../api/client";
import type { CardiacMetrics } from "../metrics/hrv";

const TOOLS: Array<{ id: Tool; label: string }> = [
  { id: "zoom", label: "🔍 Zoom" },
  { id: "ruler", label: "📏 Regla" },
  { id: "crop", label: "✂️ Recorte" },
  { id: "marker", label: "📍 Marcar" },
];

/**
 * Pantalla principal de ECGViewer: carga (US1), métricas por ventana (US2),
 * zoom (US3), filtros vía backend (US4), regla y recorte con confirmación (US5)
 * y marcadores (US6). El guardado (US8) se incorpora aparte.
 */
export function MainPage() {
  const { state, toggleGrid, markDirty } = useAppState();
  const { tool, setTool, cursor } = useTool();

  const [derivation, setDerivation] = useState<Derivation | null>(null);
  const [pendingCrop, setPendingCrop] = useState<CropRange | null>(null);
  const [filterBusy, setFilterBusy] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const working: Signal | null = useMemo(
    () => (derivation ? deriveWorking(derivation) : null),
    [derivation]
  );

  const { window, zoomTo, reset } = useVisibleWindow(working);
  const markers = useMarkers(markDirty);
  useUnsavedGuard(state.dirty);

  const metrics: CardiacMetrics | null = useMemo(() => {
    if (!working) return null;
    return metricsForWindow(working, window);
  }, [working, window]);

  function handleLoad(signal: Signal) {
    setDerivation(initDerivation(signal));
    setPendingCrop(null);
    setFilterError(null);
    markers.reset([]);
  }

  function confirmCrop() {
    if (derivation && pendingCrop) {
      setDerivation(applyCrop(derivation, pendingCrop));
      markDirty();
    }
    setPendingCrop(null);
  }

  async function handleApplyFilter(config: FilterConfig) {
    if (!derivation) return;
    setFilterBusy(true);
    setFilterError(null);
    try {
      // El filtro se aplica sobre la señal ORIGINAL completa (data-model.md).
      const filtered = await applyFilterApi(derivation.original, config);
      setDerivation((d) => (d ? applyFilterModel(d, filtered) : d));
      markDirty();
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.apiError.message
          : "No se pudo aplicar el filtro (¿backend en http://localhost:5080?).";
      setFilterError(msg);
    } finally {
      setFilterBusy(false);
    }
  }

  function handleRevertFilter() {
    setDerivation((d) => (d ? revertFilter(d) : d));
    setFilterError(null);
    markDirty();
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>
        ECGViewer{" "}
        {state.dirty && (
          <small style={{ color: "#c62828" }} data-testid="dirty-flag">
            • cambios sin guardar
          </small>
        )}
      </h1>

      <section
        className="toolbar"
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <FileLoader onLoad={handleLoad} />
        <label>
          <input
            type="checkbox"
            checked={state.showGrid}
            onChange={toggleGrid}
          />{" "}
          Rejilla ECG
        </label>
        <div
          style={{ display: "flex", gap: 4 }}
          role="group"
          aria-label="Herramientas"
        >
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              disabled={!working}
              style={{ fontWeight: tool === t.id ? 700 : 400 }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={reset} disabled={!working}>
          Restablecer zoom
        </button>
      </section>

      <section style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <ECGChart
          signal={working}
          window={window}
          showGrid={state.showGrid}
          tool={tool}
          cursor={cursor}
          markers={markers.markers}
          onZoom={(r) => zoomTo(r.fromTime, r.toTime)}
          onCropSelect={(r) => setPendingCrop(r)}
          onAddMarker={(time) => markers.add(time)}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MetricsPanel metrics={metrics} />
          <FilterPanel
            disabled={!working}
            hasFilter={derivation?.filteredSamples != null}
            busy={filterBusy}
            error={filterError}
            onApply={handleApplyFilter}
            onRevert={handleRevertFilter}
          />
          <section>
            <h3>Marcadores</h3>
            <MarkerEditor
              markers={markers.markers}
              onEdit={markers.edit}
              onRemove={markers.remove}
            />
          </section>
        </div>
      </section>

      {!working && (
        <p style={{ color: "#666" }}>
          Cargá un archivo CSV de ECG monocanal (columnas tiempo, valor) para
          comenzar.
        </p>
      )}

      <ConfirmDialog
        open={pendingCrop !== null}
        message={
          pendingCrop
            ? `¿Recortar la señal al rango ${pendingCrop.fromTime.toFixed(
                2
              )}–${pendingCrop.toTime.toFixed(2)} s? Esta acción es reversible.`
            : ""
        }
        confirmLabel="Recortar"
        onConfirm={confirmCrop}
        onCancel={() => setPendingCrop(null)}
      />
    </main>
  );
}
