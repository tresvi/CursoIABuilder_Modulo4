/**
 * Marcadores de evento anclados al eje temporal (US6, FR-011/012/013).
 * Operaciones puras e inmutables sobre la lista de marcadores de la sesión.
 */
export interface EventMarker {
  id: string;
  /** instante anclado en segundos */
  time: number;
  /** etiqueta o comentario editable */
  label: string;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `m${Date.now().toString(36)}-${counter}`;
}

/** Crea un marcador anclado a `time` (AC-05). Devuelve una lista nueva. */
export function addMarker(
  markers: readonly EventMarker[],
  time: number,
  label = ""
): EventMarker[] {
  return [...markers, { id: nextId(), time, label }];
}

/** Edita la etiqueta de un marcador (AC-06). Devuelve una lista nueva. */
export function editMarker(
  markers: readonly EventMarker[],
  id: string,
  label: string
): EventMarker[] {
  return markers.map((m) => (m.id === id ? { ...m, label } : m));
}

/** Elimina un marcador (AC-07). Devuelve una lista nueva. */
export function removeMarker(
  markers: readonly EventMarker[],
  id: string
): EventMarker[] {
  return markers.filter((m) => m.id !== id);
}
