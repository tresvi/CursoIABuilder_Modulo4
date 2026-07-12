import { useCallback, useState } from "react";

export interface AppUiState {
  showGrid: boolean;
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
    dirty: false,
  });

  const toggleGrid = useCallback(
    () => setState((s) => ({ ...s, showGrid: !s.showGrid })),
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

  return { state, toggleGrid, markDirty, clearDirty };
}
