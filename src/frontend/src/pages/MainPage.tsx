import { useEffect, useMemo, useRef, useState } from "react";
import { FileLoader } from "../components/FileLoader";
import { ECGChart } from "../components/ECGChart";
import { MetricsPanel } from "../components/MetricsPanel";
import { MarkerEditor } from "../components/MarkerEditor";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MarkerPromptDialog } from "../components/MarkerPromptDialog";
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
  createSignal,
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
import { getStudy, saveStudy, type SavedStudy } from "../api/studyApi";
import { exportXlsx, importXlsx } from "../api/excelApi";
import { ApiRequestError } from "../api/client";
import type { CardiacMetrics } from "../metrics/hrv";

const TOOLS: Array<{ id: Tool; label: string }> = [
  { id: "zoom", label: "🔍 Zoom" },
  { id: "pan", label: "✋ Desplazar" },
  { id: "ruler", label: "📏 Regla" },
  { id: "crop", label: "✂️ Recorte" },
  { id: "marker", label: "📍 Marcar" },
];

/**
 * Pantalla principal de ECGViewer: carga (US1), métricas por ventana (US2),
 * zoom (US3), filtros vía backend (US4), regla y recorte con confirmación (US5),
 * marcadores (US6), import/export XLSX (US7) y guardado/restauración (US8).
 */
export function MainPage() {
  const { state, toggleGrid, setPaperSpeed, markDirty, clearDirty } =
    useAppState();
  const { tool, setTool, cursor } = useTool();

  const [derivation, setDerivation] = useState<Derivation | null>(null);
  const [pendingCrop, setPendingCrop] = useState<CropRange | null>(null);
  const [pendingMarkerTime, setPendingMarkerTime] = useState<number | null>(
    null
  );
  const [filterBusy, setFilterBusy] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const working: Signal | null = useMemo(
    () => (derivation ? deriveWorking(derivation) : null),
    [derivation]
  );

  const { window, zoomTo, panBy, reset } = useVisibleWindow(working);
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
    setActiveFilter(null);
    setSaveStatus(null);
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
      setActiveFilter(config);
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
    setActiveFilter(null);
    setFilterError(null);
    markDirty();
  }

  async function handleExportXlsx() {
    if (!working) return;
    try {
      await exportXlsx(working);
    } catch {
      setSaveStatus(
        "No se pudo exportar (¿backend en http://localhost:5080?)."
      );
    }
  }

  async function handleImportXlsx(file: File) {
    try {
      const signal = await importXlsx(file);
      handleLoad(signal);
    } catch (e) {
      setSaveStatus(
        e instanceof ApiRequestError
          ? `Error al importar: ${e.apiError.message}`
          : "No se pudo importar el .xlsx."
      );
    }
  }

  // Persistencia explícita (Principio III, FR-016): SOLO "Guardar" persiste.
  async function handleSave() {
    if (!derivation) return;
    const study: SavedStudy = {
      signal: {
        samples: derivation.original.samples as SavedStudy["signal"]["samples"],
        fs: derivation.original.fs,
      },
      markers: markers.markers,
      filter: activeFilter,
      crop: derivation.crop,
    };
    try {
      const savedAt = await saveStudy(study);
      clearDirty();
      setSaveStatus(`Guardado ${new Date(savedAt).toLocaleTimeString()}`);
    } catch (e) {
      setSaveStatus(
        e instanceof ApiRequestError
          ? `Error al guardar: ${e.apiError.message}`
          : "No se pudo guardar (¿backend en http://localhost:5080?)."
      );
    }
  }

  // Restaura el estudio guardado al iniciar (RF-021). Reconstruye original,
  // re-aplica el filtro (vía backend) y el recorte.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const study = await getStudy();
        if (!study || cancelled) return;
        const original = createSignal(study.signal.samples);
        let d = initDerivation(original);
        if (study.filter) {
          try {
            const filtered = await applyFilterApi(original, study.filter);
            d = applyFilterModel(d, filtered);
          } catch {
            /* si el backend no filtra, se restaura sin filtro */
          }
        }
        if (study.crop) d = applyCrop(d, study.crop);
        if (cancelled) return;
        setDerivation(d);
        setActiveFilter(study.filter);
        markers.reset(study.markers);
        clearDirty();
        setSaveStatus("Estudio restaurado");
      } catch {
        /* sin backend o sin estudio: se inicia vacío */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Botón de una herramienta de mouse (modo activo): resalta el seleccionado.
  const toolBtn = (id: Tool) => {
    const label = TOOLS.find((t) => t.id === id)!.label;
    return (
      <button
        key={id}
        onClick={() => setTool(id)}
        aria-pressed={tool === id}
        disabled={!working}
        style={{ fontWeight: tool === id ? 700 : 400 }}
      >
        {label}
      </button>
    );
  };

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
        <label>
          Velocidad{" "}
          <select
            aria-label="Velocidad de papel"
            value={state.paperSpeed}
            onChange={(e) => setPaperSpeed(Number(e.target.value) as 25 | 50)}
            disabled={!state.showGrid}
          >
            <option value={25}>25 mm/s</option>
            <option value={50}>50 mm/s</option>
          </select>
        </label>
        {/* Barra de herramientas: acciones y modos de mouse agrupados, en el
            orden pedido (Exportar, Importar, Zoom, Restablecer, Desplazar,
            Regla, Recorte, Marcar). */}
        <div
          role="toolbar"
          aria-label="Herramientas"
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "4px 8px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <button onClick={handleExportXlsx} disabled={!working}>
            ⬇️ Exportar XLSX
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            title="Importar una señal desde un archivo .xlsx"
          >
            ⬆️ Importar XLSX
          </button>
          {toolBtn("zoom")}
          <button onClick={reset} disabled={!working}>
            🔄 Restablecer zoom
          </button>
          {toolBtn("pan")}
          {toolBtn("ruler")}
          {toolBtn("crop")}
          {toolBtn("marker")}
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx"
            aria-label="Importar archivo XLSX"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportXlsx(f);
              e.target.value = "";
            }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!working}
          style={{ fontWeight: 600 }}
          data-testid="save-btn"
        >
          💾 Guardar
        </button>
        {saveStatus && (
          <small style={{ color: "#2e7d32" }} data-testid="save-status">
            {saveStatus}
          </small>
        )}
      </section>

      <section
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <ECGChart
          signal={working}
          window={window}
          showGrid={state.showGrid}
          paperSpeed={state.paperSpeed}
          tool={tool}
          cursor={cursor}
          markers={markers.markers}
          onZoom={(r) => zoomTo(r.fromTime, r.toTime)}
          onPan={(dt) => panBy(dt)}
          onCropSelect={(r) => setPendingCrop(r)}
          onAddMarker={(time) => setPendingMarkerTime(time)}
        />
        {/* Métricas de la ventana visible: fijas al lado derecho del gráfico. */}
        <MetricsPanel metrics={metrics} />
      </section>

      <section
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginTop: 16,
        }}
      >
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

      <MarkerPromptDialog
        open={pendingMarkerTime !== null}
        onConfirm={(text) => {
          if (pendingMarkerTime !== null) markers.add(pendingMarkerTime, text);
          setPendingMarkerTime(null);
        }}
        onCancel={() => setPendingMarkerTime(null)}
      />
    </main>
  );
}
