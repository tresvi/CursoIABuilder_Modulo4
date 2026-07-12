import { useCallback, useState } from "react";
import {
  addMarker,
  editMarker,
  removeMarker,
  type EventMarker,
} from "../signal/markers";

/**
 * Estado de sesión de los marcadores (US6). Cada cambio notifica `onChange`
 * para marcar el trabajo como "dirty" (persistencia explícita, Principio III).
 */
export function useMarkers(onChange?: () => void) {
  const [markers, setMarkers] = useState<EventMarker[]>([]);

  const add = useCallback(
    (time: number, label = "") => {
      setMarkers((m) => addMarker(m, time, label));
      onChange?.();
    },
    [onChange]
  );
  const edit = useCallback(
    (id: string, label: string) => {
      setMarkers((m) => editMarker(m, id, label));
      onChange?.();
    },
    [onChange]
  );
  const remove = useCallback(
    (id: string) => {
      setMarkers((m) => removeMarker(m, id));
      onChange?.();
    },
    [onChange]
  );
  const reset = useCallback((next: EventMarker[]) => setMarkers(next), []);

  return { markers, add, edit, remove, reset };
}
