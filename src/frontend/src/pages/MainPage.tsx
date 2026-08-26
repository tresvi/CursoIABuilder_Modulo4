import { useEffect, useMemo, useRef, useState } from "react";
import { FileLoader } from "../components/FileLoader";
import { ECGChart } from "../components/ECGChart";
import { SpectrumChart } from "../components/SpectrumChart";
import { MetricsPanel } from "../components/MetricsPanel";
import { MarkerEditor } from "../components/MarkerEditor";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MarkerPromptDialog } from "../components/MarkerPromptDialog";
import {
  SerialConfigDialog,
  type SerialConnectionConfig,
} from "../components/SerialConfigDialog";
import { FilterPanel } from "../components/FilterPanel";
import { ExampleMenu } from "../components/ExampleMenu";
import { Button } from "../components/ui/button";
import { LineChart, ChevronDown, History } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Sidebar } from "../components/layout/Sidebar";
import { TopBar } from "../components/layout/TopBar";
import { StatusBar } from "../components/layout/StatusBar";
import { Card } from "../components/ui/card";
import { useAppState } from "../hooks/useAppState";
import { useVisibleWindow } from "../hooks/useVisibleWindow";
import { useTool } from "../hooks/useTool";
import { useMarkers } from "../hooks/useMarkers";
import { useUnsavedGuard } from "../hooks/useUnsavedGuard";
import { useComplexDetection } from "../hooks/useComplexDetection";
import { metricsForWindow, samplesInWindow } from "../metrics/windowMetrics";
import { computeSpectrum, type SpectrumPoint } from "../api/spectrumApi";
import { listPorts } from "../api/serialApi";
import { useSerialConnection } from "../hooks/useSerialConnection";
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
  type FilterKind,
} from "../api/filterApi";
import { getStudy, saveStudy, type SavedStudy } from "../api/studyApi";
import { exportXlsx, importXlsx } from "../api/excelApi";
import { downloadCsv } from "../signal/csvExport";
import { ApiRequestError } from "../api/client";
import type { CardiacMetrics } from "../metrics/hrv";

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
  const [filterType, setFilterType] = useState<FilterKind>("bandpass");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [savedStudy, setSavedStudy] = useState<SavedStudy | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const working: Signal | null = useMemo(
    () => (derivation ? deriveWorking(derivation) : null),
    [derivation]
  );

  // "Conectarse" (feature 005, US2): mientras la señal mostrada viene de una
  // conexión serie activa, la ventana se autosigue (research.md D8) y usa una
  // clave de carga propia (`serialSessionKey`) que solo cambia al iniciar una
  // conexión nueva — así no se resetea a los primeros 20 s en cada lote.
  const [usingSerialSignal, setUsingSerialSignal] = useState(false);
  const [serialSessionKey, setSerialSessionKey] = useState(0);
  const serialConnection = useSerialConnection();
  const serialConnected = serialConnection.status === "connected";

  // `derivation.original` cambia solo al cargar otra señal (initDerivation); al
  // filtrar/recortar se conserva, por eso sirve de clave de "carga nueva".
  const { window, zoomTo, panBy, reset } = useVisibleWindow(
    working,
    usingSerialSignal ? `serial-${serialSessionKey}` : derivation?.original,
    usingSerialSignal && serialConnected
  );
  const markers = useMarkers(markDirty);
  useUnsavedGuard(state.dirty);

  // "Detec. Complejos" (feature 003): `complexDetectionOn` es la intención del
  // usuario (botón activo/inactivo); el estado idle/processing/ready de la
  // corrida en curso lo maneja el hook. Nunca se persiste (FR-010).
  const [complexDetectionOn, setComplexDetectionOn] = useState(false);
  const {
    status: complexStatus,
    result: complexResult,
    run: runComplexDetection,
    reset: resetComplexDetection,
  } = useComplexDetection();

  function handleToggleComplexDetection() {
    setComplexDetectionOn((on) => {
      if (on) resetComplexDetection();
      return !on;
    });
  }

  // Recalcula automáticamente sobre la señal actualmente mostrada (original o
  // filtrada) cada vez que cambia, mientras la herramienta esté activa
  // (FR-007): el filtrado puede desplazar los complejos.
  useEffect(() => {
    if (complexDetectionOn && working) {
      runComplexDetection(working);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complexDetectionOn, working]);

  // "Espectro" (feature 004): reemplaza el trazado por el espectro de potencia
  // de la ventana visible (research.md D2), calculado en el backend. Nunca se
  // persiste (FR-010); nunca convive con el trazado (D3, "nunca ambos a la vez").
  const [spectrumOn, setSpectrumOn] = useState(false);
  const [spectrum, setSpectrum] = useState<SpectrumPoint[] | null>(null);
  const [spectrumBusy, setSpectrumBusy] = useState(false);
  const [spectrumError, setSpectrumError] = useState<string | null>(null);

  function handleToggleSpectrum() {
    setSpectrumOn((on) => {
      if (on) {
        setSpectrum(null);
        setSpectrumError(null);
      }
      return !on;
    });
  }

  // Recalcula sobre la ventana visible (no toda la señal) cada vez que cambia
  // la señal mostrada o la ventana, mientras "Espectro" esté activo (FR-005).
  useEffect(() => {
    if (!spectrumOn || !working) return;
    let cancelled = false;
    setSpectrumBusy(true);
    setSpectrumError(null);
    const windowed = {
      samples: samplesInWindow(working, window.fromTime, window.toTime),
      fs: working.fs,
      durationSec: window.toTime - window.fromTime,
    };
    computeSpectrum(windowed)
      .then((points) => {
        if (cancelled) return;
        setSpectrum(points);
      })
      .catch((e) => {
        if (cancelled) return;
        setSpectrum(null);
        setSpectrumError(
          e instanceof ApiRequestError
            ? e.apiError.message
            : "No se pudo calcular el espectro (¿backend en http://localhost:5080?)."
        );
      })
      .finally(() => {
        if (!cancelled) setSpectrumBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spectrumOn, working, window]);

  // "Conectarse" (feature 005, US1): configuración de puerto/baudios. La
  // conexión real (US2) se conecta acá cuando esté implementada.
  const [serialConfigDialogOpen, setSerialConfigDialogOpen] = useState(false);
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [serialConfig, setSerialConfig] =
    useState<SerialConnectionConfig | null>(null);

  function handleOpenSerialConfig() {
    listPorts()
      .then(setSerialPorts)
      .catch(() => setSerialPorts([]));
    setSerialConfigDialogOpen(true);
  }

  const metrics: CardiacMetrics | null = useMemo(() => {
    if (!working) return null;
    return metricsForWindow(working, window);
  }, [working, window]);

  function handleLoad(signal: Signal) {
    if (serialConnected) void serialConnection.disconnect();
    setUsingSerialSignal(false);
    setDerivation(initDerivation(signal));
    setPendingCrop(null);
    setFilterError(null);
    setActiveFilter(null);
    setSaveStatus(null);
    markers.reset([]);
  }

  // "Conectarse" (feature 005, US2): cada muestra nueva del hook reemplaza la
  // derivación actual con la señal acumulada hasta el momento (mismo
  // `initDerivation` que cargar un archivo, FR-011).
  useEffect(() => {
    if (!usingSerialSignal || serialConnection.samples.length === 0) return;
    setDerivation(initDerivation(createSignal([...serialConnection.samples])));
  }, [usingSerialSignal, serialConnection.samples]);

  function handleConnectSerial() {
    if (!serialConfig) return;
    setSerialSessionKey((k) => k + 1);
    setUsingSerialSignal(true);
    setPendingCrop(null);
    setFilterError(null);
    setActiveFilter(null);
    setSaveStatus(null);
    markers.reset([]);
    void serialConnection.connect(serialConfig);
  }

  function handleDisconnectSerial() {
    void serialConnection.disconnect();
    setUsingSerialSignal(false);
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

  function handleExportCsv() {
    if (!working) return;
    downloadCsv(working);
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
      setFileName(file.name);
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

  // Detecta si hay un estudio guardado (RF-021) SIN aplicarlo: la app arranca
  // siempre en el estado vacío y ofrece restaurarlo con un botón explícito.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const study = await getStudy();
        if (!cancelled && study) setSavedStudy(study);
      } catch {
        /* sin backend o sin estudio: se inicia vacío */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar.
  }, []);

  // Restaura el estudio guardado a pedido: reconstruye original, re-aplica el
  // filtro (vía backend) y el recorte.
  async function handleRestoreStudy() {
    if (!savedStudy) return;
    const study = savedStudy;
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
    setDerivation(d);
    setActiveFilter(study.filter);
    if (study.filter) setFilterType(study.filter.type);
    markers.reset(study.markers);
    clearDirty();
    setFileName("Estudio guardado");
    setSaveStatus("Estudio restaurado");
  }

  return (
    <AppLayout
      sidebar={
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          hasSignal={!!working}
          fileLoader={
            <FileLoader
              onLoad={handleLoad}
              onSourceName={setFileName}
              collapsed={collapsed}
            />
          }
          onImportXlsx={() => importInputRef.current?.click()}
          onSave={handleSave}
          onExportCsv={handleExportCsv}
          onExportXlsx={handleExportXlsx}
          tool={tool}
          onSelectTool={setTool}
          showGrid={state.showGrid}
          onToggleGrid={toggleGrid}
          onResetZoom={reset}
          complexDetectionActive={complexDetectionOn}
          complexDetectionStatus={complexStatus}
          onToggleComplexDetection={handleToggleComplexDetection}
          spectrumActive={spectrumOn}
          spectrumStatus={
            spectrumBusy ? "busy" : spectrumError ? "error" : spectrumOn ? "ready" : "idle"
          }
          onToggleSpectrum={handleToggleSpectrum}
          onOpenSerialConfig={handleOpenSerialConfig}
          serialConfigured={!!serialConfig}
          serialConnected={serialConnected}
          onToggleSerialConnection={handleConnectSerial}
          onDisconnectSerial={handleDisconnectSerial}
        />
      }
      topBar={
        <TopBar
          fileName={fileName}
          hasSignal={!!working}
          dirty={state.dirty}
          saveStatus={saveStatus}
          showGrid={state.showGrid}
          paperSpeed={state.paperSpeed}
          onPaperSpeed={setPaperSpeed}
          durationSec={derivation?.original.durationSec ?? null}
        />
      }
      statusBar={<StatusBar signal={working} />}
    >
      {/* Encabezado accesible requerido por los tests/lectores de pantalla. */}
      <h1 className="sr-only">ECGViewer</h1>

      {working ? (
        <div className="flex flex-col gap-6">
          {/* El gráfico ocupa 50 vh de alto: la fila suma el p-3 de la Card
              (1.5rem) y sus bordes (2px) para que al canvas le queden 50 vh
              netos. Las métricas estiran a la par por `items-stretch`. */}
          <div className="flex h-[calc(50vh+1.5rem+2px)] min-h-[386px] items-stretch gap-4">
            <Card className="min-w-0 flex-1 p-3">
              {spectrumOn ? (
                spectrumError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {spectrumError}
                  </p>
                ) : (
                  <SpectrumChart points={spectrum ?? []} />
                )
              ) : (
                <ECGChart
                  signal={working}
                  window={window}
                  showGrid={state.showGrid}
                  paperSpeed={state.paperSpeed}
                  tool={tool}
                  cursor={cursor}
                  markers={markers.markers}
                  complexMarks={complexResult?.complexes ?? []}
                  onZoom={(r) => zoomTo(r.fromTime, r.toTime)}
                  onPan={(dt) => panBy(dt)}
                  onCropSelect={(r) => setPendingCrop(r)}
                  onAddMarker={(time) => setPendingMarkerTime(time)}
                />
              )}
            </Card>
            <MetricsPanel metrics={metrics} />
          </div>

          {complexDetectionOn &&
            complexStatus === "ready" &&
            complexResult &&
            complexResult.lowConfidenceRanges.length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                No se pudo detectar complejos con confianza en{" "}
                {complexResult.lowConfidenceRanges.length === 1
                  ? "un tramo de la señal"
                  : `${complexResult.lowConfidenceRanges.length} tramos de la señal`}
                ; esas zonas no muestran marcas.
              </p>
            )}

          <div className="flex flex-wrap items-start gap-6">
            <FilterPanel
              disabled={!working}
              hasFilter={derivation?.filteredSamples != null}
              busy={filterBusy}
              error={filterError}
              type={filterType}
              onTypeChange={setFilterType}
              onApply={handleApplyFilter}
              onRevert={handleRevertFilter}
            />
            <Card className="min-w-64 p-4">
              <h3 className="mb-3 text-base font-semibold">Marcadores</h3>
              <MarkerEditor
                markers={markers.markers}
                onEdit={markers.edit}
                onRemove={markers.remove}
              />
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
          <p className="max-w-md">
            Cargá un archivo CSV de ECG monocanal (columnas tiempo, valor) para
            comenzar, o bien elige cargar un ejemplo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ExampleMenu
              onLoad={handleLoad}
              onSourceName={setFileName}
              align="center"
              renderTrigger={({ open, toggle, loading }) => (
                <Button
                  variant="outline"
                  onClick={toggle}
                  disabled={loading}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <LineChart aria-hidden />
                  {loading ? "Cargando…" : "Cargar ejemplo"}
                  <ChevronDown aria-hidden />
                </Button>
              )}
            />
            {savedStudy && (
              <Button variant="ghost" onClick={() => void handleRestoreStudy()}>
                <History aria-hidden />
                Restaurar último estudio
              </Button>
            )}
          </div>
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx"
        aria-label="Importar archivo XLSX"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportXlsx(f);
          e.target.value = "";
        }}
      />

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

      <SerialConfigDialog
        open={serialConfigDialogOpen}
        ports={serialPorts}
        onConfirm={(config) => {
          setSerialConfig(config);
          setSerialConfigDialogOpen(false);
        }}
        onCancel={() => setSerialConfigDialogOpen(false)}
      />
    </AppLayout>
  );
}
