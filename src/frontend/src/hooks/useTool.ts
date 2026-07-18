import { useCallback, useState } from "react";

/** Herramientas de interacción con el gráfico (cursor propio por herramienta). */
export type Tool = "none" | "zoom" | "pan" | "ruler" | "crop" | "marker";

/**
 * Cruz fina de precisión para marcar sobre la señal: brazos de 1 px con un
 * hueco central que deja ver el punto exacto bajo el cursor, y halo blanco para
 * que se distinga tanto sobre la rejilla rosa como sobre el trazo azul. El
 * hotspot va en el centro (12 12), así el marcador cae justo donde apunta.
 */
const PRECISION_CROSSHAIR_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>" +
  "<g shape-rendering='crispEdges' fill='none'>" +
  "<g stroke='white' stroke-width='3' opacity='.9'>" +
  "<path d='M12.5 1v8M12.5 15v8M1 12.5h8M15 12.5h8'/></g>" +
  "<g stroke='black' stroke-width='1'>" +
  "<path d='M12.5 1v8M12.5 15v8M1 12.5h8M15 12.5h8'/></g>" +
  "</g></svg>";

/** Cursor CSS de la herramienta "Marcar" (con fallback si el SVG no carga). */
export const MARKER_CURSOR = `url("data:image/svg+xml;utf8,${PRECISION_CROSSHAIR_SVG}") 12 12, crosshair`;

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
      return MARKER_CURSOR;
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
