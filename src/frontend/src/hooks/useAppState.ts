import { useCallback, useState } from "react";
import type { PaperSpeed } from "../render/drawGrid";

export interface AppUiState {
  showGrid: boolean;
  /** velocidad de papel (mm/s) para la escala temporal de la grilla */
  paperSpeed: PaperSpeed;
  /** hay cambios sin guardar (marcadores/filtros/recortes) — guardia FR-018 */
  dirty: boolean;
}

/**
 * Estado transitorio de UI no ligado a una herramienta (la herramienta activa
 * vive en `useTool`). No se persiste salvo "Guardar".
 */
export function useAppState() {
  const [state, setState] = useState<AppUiState>({
    showGrid: true,
    paperSpeed: 25,
    dirty: false,
  });

  const toggleGrid = useCallback(
    () => setState((s) => ({ ...s, showGrid: !s.showGrid })),
    []
  );
  const setPaperSpeed = useCallback(
    (paperSpeed: PaperSpeed) => setState((s) => ({ ...s, paperSpeed })),
    []
  );
  const markDirty = useCallback(
    () => setState((s) => ({ ...s, dirty: true })),
    []
  );
  const clearDirty = useCallback(
    () => setState((s) => ({ ...s, dirty: false })),
    []
  );

  return { state, toggleGrid, setPaperSpeed, markDirty, clearDirty };
}
