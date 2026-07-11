import { useCallback, useState } from "react";

/** Herramientas de interacción con el gráfico (cursor propio por herramienta). */
export type Tool = "none" | "zoom" | "ruler" | "crop" | "marker";

export interface AppUiState {
  activeTool: Tool;
  showGrid: boolean;
  /** hay cambios sin guardar (marcadores/filtros/recortes) — guardia FR-018 */
  dirty: boolean;
}

/** Estado transitorio de UI (no persistido salvo "Guardar"). */
export function useAppState() {
  const [state, setState] = useState<AppUiState>({
    activeTool: "none",
    showGrid: true,
    dirty: false,
  });

  const setTool = useCallback(
    (activeTool: Tool) => setState((s) => ({ ...s, activeTool })),
    []
  );
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

  return { state, setTool, toggleGrid, markDirty, clearDirty };
}
