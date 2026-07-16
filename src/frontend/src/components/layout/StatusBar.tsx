import { Clock, Database, Waves } from "lucide-react";
import type { Signal } from "@/signal/signalModel";

interface StatusBarProps {
  signal: Signal | null;
}

/** Barra de estado inferior: Fs, Duración y Muestras de la señal de trabajo. */
export function StatusBar({ signal }: StatusBarProps) {
  const fs = signal ? Math.round(signal.fs) : null;
  const duration = signal ? signal.durationSec : null;
  const samples = signal ? signal.samples.length : null;

  return (
    <footer
      className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-border bg-card px-6 py-2 text-sm text-muted-foreground"
      data-testid="status-bar"
    >
      <span className="flex items-center gap-2">
        <Waves className="size-4" aria-hidden />
        Fs <strong className="font-semibold text-foreground">{fs ?? "—"}</strong>
        {fs != null && "Hz"}
      </span>
      <span className="flex items-center gap-2">
        <Clock className="size-4" aria-hidden />
        Duración{" "}
        <strong className="font-semibold text-foreground">
          {duration != null ? `${duration.toFixed(1)} s` : "—"}
        </strong>
      </span>
      <span className="flex items-center gap-2">
        <Database className="size-4" aria-hidden />
        Muestras{" "}
        <strong className="font-semibold text-foreground">
          {samples ?? "—"}
        </strong>
      </span>
    </footer>
  );
}
