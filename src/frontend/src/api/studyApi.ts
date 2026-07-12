import { apiFetch, ApiRequestError } from "./client";
import type { Sample } from "../signal/signalModel";
import type { EventMarker } from "../signal/markers";
import type { FilterConfig } from "./filterApi";
import type { CropRange } from "../signal/signalModel";

/** Estudio guardado (único): señal original + marcadores + filtro + recorte. */
export interface SavedStudy {
  signal: { samples: Sample[]; fs?: number };
  markers: EventMarker[];
  filter: FilterConfig | null;
  crop: CropRange | null;
  savedAt?: string;
}

/** Restaura el estudio guardado, o null si no hay ninguno (404). */
export async function getStudy(): Promise<SavedStudy | null> {
  try {
    return await apiFetch<SavedStudy>("/api/study");
  } catch (e) {
    if (e instanceof ApiRequestError && e.apiError.code === "NOT_FOUND")
      return null;
    throw e;
  }
}

/**
 * Guarda (reemplaza) el estudio. Se invoca SOLO por acción explícita "Guardar"
 * (Principio III, FR-016/017). Devuelve el instante de guardado.
 */
export async function saveStudy(study: SavedStudy): Promise<string> {
  const res = await apiFetch<{ savedAt: string }>("/api/study", {
    method: "PUT",
    body: JSON.stringify(study),
  });
  return res.savedAt;
}
