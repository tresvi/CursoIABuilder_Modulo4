import { useCallback, useState } from "react";

/** Herramientas de interacción con el gráfico (cursor propio por herramienta). */
export type Tool = "none" | "zoom" | "pan" | "ruler" | "crop" | "marker";

/** Cursor CSS asociado a cada herramienta. */
export function cursorForTool(tool: Tool): string {
  switch (tool) {
    case "zoom":
      return "zoom-in";
    case "pan":
      return "grab";
    case "ruler":
    case "crop":
      return "crosshair";
    case "marker":
      return "cell";
    default:
      return "default";
  }
}

/**
 * Gestiona la herramienta activa y su cursor. Seleccionar la herramienta ya
 * activa la desactiva (vuelve a 'none'), como un toggle.
 */
export function useTool() {
  const [tool, setToolState] = useState<Tool>("none");

  const setTool = useCallback((next: Tool) => {
    setToolState((cur) => (cur === next ? "none" : next));
  }, []);

  return { tool, setTool, cursor: cursorForTool(tool) };
}
