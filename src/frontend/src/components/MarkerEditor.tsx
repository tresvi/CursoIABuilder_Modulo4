import { X } from "lucide-react";
import type { EventMarker } from "../signal/markers";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface Props {
  markers: EventMarker[];
  onEdit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}

/** Lista de marcadores con edición de etiqueta y eliminación (US6, AC-06/07). */
export function MarkerEditor({ markers, onEdit, onRemove }: Props) {
  if (markers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="markers-empty">
        Sin marcadores. Activá la herramienta “Marcar” y hacé clic sobre el
        gráfico.
      </p>
    );
  }
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  return (
    <ul className="m-0 list-none space-y-2 p-0" data-testid="marker-list">
      {sorted.map((m) => (
        <li key={m.id} className="flex items-center gap-2">
          <span className="min-w-20 text-sm tabular-nums text-muted-foreground">
            {m.time.toFixed(3)} s
          </span>
          <Input
            aria-label={`Etiqueta del marcador en ${m.time.toFixed(3)} s`}
            value={m.label}
            placeholder="etiqueta…"
            onChange={(e) => onEdit(m.id, e.target.value)}
            className="h-9"
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Eliminar marcador en ${m.time.toFixed(3)} s`}
            onClick={() => onRemove(m.id)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
