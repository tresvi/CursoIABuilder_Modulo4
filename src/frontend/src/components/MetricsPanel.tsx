import { Activity, HeartPulse, Percent, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CardiacMetrics } from "../metrics/hrv";
import { Card } from "./ui/card";

interface Props {
  metrics: CardiacMetrics | null;
}

/** Formatea una métrica: null → "—" (no disponible), nunca 0 (FR-006). */
function fmt(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits);
}

interface MetricDef {
  key: string;
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  big?: boolean;
}

/**
 * Panel de métricas cardíacas sobre la ventana visible (US2). Encuadrado en un
 * cuadro blanco que estira al alto del gráfico; las tarjetas internas se
 * distribuyen para llenar ese alto. Permanece visible aunque falten latidos;
 * las no calculables se muestran como "—" (FR-006).
 */
export function MetricsPanel({ metrics }: Props) {
  const m = metrics;
  const items: MetricDef[] = [
    {
      key: "bpm",
      label: "BPM",
      value: fmt(m?.bpm ?? null, 0),
      unit: "bpm",
      icon: HeartPulse,
      big: true,
    },
    {
      key: "sdnn",
      label: "SDNN",
      value: fmt(m?.sdnn ?? null),
      unit: "ms",
      icon: Waves,
    },
    {
      key: "rmssd",
      label: "RMSSD",
      value: fmt(m?.rmssd ?? null),
      unit: "ms",
      icon: Activity,
    },
    {
      key: "pnn50",
      label: "pNN50",
      value: fmt(m?.pnn50 ?? null),
      unit: "%",
      icon: Percent,
    },
  ];

  return (
    <Card
      className="flex w-44 shrink-0 flex-col gap-2 p-2.5"
      data-testid="metrics-panel"
    >
      <h2 className="flex items-center gap-1.5 border-b border-border pb-2 text-base font-semibold">
        <HeartPulse className="size-4 shrink-0 text-primary" aria-hidden />
        Métricas
      </h2>

      <div className="flex flex-1 flex-col gap-1.5">
        {items.map((it) => (
          <div
            key={it.key}
            className="flex flex-1 flex-col justify-center rounded-lg border border-border px-2 py-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[15px] font-medium text-muted-foreground">
                <it.icon className="size-3.5 text-primary" aria-hidden />
                {it.label}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {it.unit}
              </span>
            </div>
            <div className="text-right leading-none">
              <span
                className={
                  it.big
                    ? "text-4xl font-bold text-primary"
                    : "text-3xl font-bold text-primary"
                }
                data-testid={`metric-${it.key}`}
              >
                {it.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
