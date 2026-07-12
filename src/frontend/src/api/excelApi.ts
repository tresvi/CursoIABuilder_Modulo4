import { API_BASE } from "./config";
import { ApiRequestError, type ApiError } from "./client";
import { createSignal, type Sample, type Signal } from "../signal/signalModel";

async function readApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error) return body.error as ApiError;
  } catch {
    /* sin cuerpo JSON */
  }
  return { code: "HTTP_ERROR", message: `HTTP ${res.status}` };
}

/**
 * Exporta la señal a un archivo .xlsx (RF-12) y dispara la descarga en el
 * navegador. Envía la señal al backend y guarda el binario devuelto.
 */
export async function exportXlsx(
  signal: Signal,
  fileName = "ecg.xlsx"
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/export/xlsx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ samples: signal.samples, fs: signal.fs }),
  });
  if (!res.ok) throw new ApiRequestError(await readApiError(res));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Importa una señal desde un .xlsx (RF-13). Devuelve la señal parseada. */
export async function importXlsx(file: File): Promise<Signal> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(`${API_BASE}/api/import/xlsx`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new ApiRequestError(await readApiError(res));

  const body = (await res.json()) as { signal: { samples: Sample[] } };
  return createSignal(body.signal.samples);
}
