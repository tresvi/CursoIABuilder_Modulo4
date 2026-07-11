import type { CardiacMetrics } from "../metrics/hrv";

interface Props {
  metrics: CardiacMetrics | null;
}

/** Formatea una métrica: null → "—" (no disponible), nunca 0 (FR-006). */
function fmt(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

/**
 * Panel de métricas cardíacas sobre la ventana visible (US2). Permanece visible
 * aunque falten latidos; las no calculables se muestran como "—" (FR-006).
 */
export function MetricsPanel({ metrics }: Props) {
  const m = metrics;
  const rows: Array<{ label: string; value: string; unit: string }> = [
    { label: "BPM", value: fmt(m?.bpm ?? null, 0), unit: "lpm" },
    { label: "SDNN", value: fmt(m?.sdnn ?? null), unit: "ms" },
    { label: "RMSSD", value: fmt(m?.rmssd ?? null), unit: "ms" },
    { label: "pNN50", value: fmt(m?.pnn50 ?? null), unit: "%" },
  ];

  return (
    <div className="metrics-panel" data-testid="metrics-panel">
      <h3>Métricas (ventana visible)</h3>
      <dl style={{ display: "grid", gridTemplateColumns: "auto auto", gap: 4 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "contents" }}>
            <dt style={{ fontWeight: 600 }}>{r.label}</dt>
            <dd data-testid={`metric-${r.label.toLowerCase()}`}>
              {r.value} <small>{r.unit}</small>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
