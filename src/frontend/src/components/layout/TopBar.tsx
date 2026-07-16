import { Activity, CheckCircle2, FileText } from "lucide-react";
import type { PaperSpeed } from "@/render/drawGrid";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

interface TopBarProps {
  fileName: string | null;
  hasSignal: boolean;
  dirty: boolean;
  saveStatus: string | null;
  showGrid: boolean;
  paperSpeed: PaperSpeed;
  onPaperSpeed: (speed: PaperSpeed) => void;
}

/**
 * Encabezado tipo breadcrumb: título del trazado, nombre de archivo y estado
 * (Analizado / sin cargar), más el flag de cambios sin guardar y el control de
 * velocidad de papel. Conserva los data-testid usados por los tests.
 */
export function TopBar({
  fileName,
  hasSignal,
  dirty,
  saveStatus,
  showGrid,
  paperSpeed,
  onPaperSpeed,
}: TopBarProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-2 font-semibold">
        <Activity className="size-5 text-primary" aria-hidden />
        <span>Tracado ECG</span>
      </div>

      <span className="text-border" aria-hidden>
        |
      </span>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <FileText className="size-4" aria-hidden />
        <span>{fileName ?? "sin archivo"}</span>
      </div>

      {hasSignal && (
        <Badge variant="success">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Analizado
        </Badge>
      )}

      {dirty && (
        <span
          className="text-sm font-medium text-destructive"
          data-testid="dirty-flag"
        >
          • cambios sin guardar
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {saveStatus && (
          <span
            className="text-sm text-emerald-600"
            data-testid="save-status"
          >
            {saveStatus}
          </span>
        )}
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Velocidad
          <Select
            aria-label="Velocidad de papel"
            value={paperSpeed}
            onChange={(e) => onPaperSpeed(Number(e.target.value) as PaperSpeed)}
            disabled={!showGrid}
            className="h-8 w-auto"
          >
            <option value={25}>25 mm/s</option>
            <option value={50}>50 mm/s</option>
          </Select>
        </label>
      </div>
    </header>
  );
}
