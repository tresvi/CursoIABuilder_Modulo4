import { useEffect } from "react";

/**
 * Alerta al usuario antes de cerrar o recargar cuando hay cambios sin guardar
 * (FR-018, RNF-06, AC-26). Usa el mecanismo estándar `beforeunload`; no persiste
 * nada automáticamente (Principio III).
 */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Requerido por algunos navegadores para disparar el diálogo de confirmación.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
