import { useMemo, useState } from "react";
import { FileLoader } from "../components/FileLoader";
import { ECGChart } from "../components/ECGChart";
import { MetricsPanel } from "../components/MetricsPanel";
import { useAppState } from "../hooks/useAppState";
import { useVisibleWindow } from "../hooks/useVisibleWindow";
import { metricsForWindow } from "../metrics/windowMetrics";
import type { Signal } from "../signal/signalModel";
import type { CardiacMetrics } from "../metrics/hrv";

/**
 * Pantalla principal de ECGViewer. Cablea carga (US1), render con rejilla (US1)
 * y métricas sobre la ventana visible (US2). Zoom/filtro/regla/recorte/marcadores
 * y guardado se incorporan en las historias P2/P3.
 */
export function MainPage() {
  const { state, toggleGrid } = useAppState();
  const [signal, setSignal] = useState<Signal | null>(null);
  const { window } = useVisibleWindow(signal);

  const metrics: CardiacMetrics | null = useMemo(() => {
    if (!signal) return null;
    return metricsForWindow(signal, window);
  }, [signal, window]);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>ECGViewer</h1>

      <section className="toolbar" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        <FileLoader onLoad={setSignal} />
        <label>
          <input type="checkbox" checked={state.showGrid} onChange={toggleGrid} />{" "}
          Rejilla ECG
        </label>
      </section>

      <section style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <ECGChart signal={signal} window={window} showGrid={state.showGrid} />
        <MetricsPanel metrics={metrics} />
      </section>

      {!signal && (
        <p style={{ color: "#666" }}>
          Cargá un archivo CSV de ECG monocanal (columnas tiempo, valor) para
          comenzar.
        </p>
      )}
    </main>
  );
}
