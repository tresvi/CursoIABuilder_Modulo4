import { apiFetch, ApiRequestError } from "./client";
import { API_BASE } from "./config";

interface SerialPortsApiResponse {
  ports: string[];
}

/** Lista los puertos COM disponibles en el backend (contracts/api.md, feature 005). */
export async function listPorts(): Promise<string[]> {
  const res = await apiFetch<SerialPortsApiResponse>("/api/serial/ports");
  return res.ports;
}

/**
 * Abre la conexión en el backend (contracts/api.md POST /api/serial/connect).
 * No usa `apiFetch` porque la respuesta exitosa no trae cuerpo JSON.
 */
export async function connectSerial(port: string, baudRate: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/serial/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ port, baudRate }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiRequestError(
      body?.error ?? { code: "HTTP_ERROR", message: `HTTP ${res.status}` }
    );
  }
}

/** Cierra la conexión activa, si la hay (idempotente). */
export async function disconnectSerial(): Promise<void> {
  await fetch(`${API_BASE}/api/serial/disconnect`, { method: "POST" });
}

/** URL absoluta del stream SSE de muestras (`GET /api/serial/stream`). */
export function serialStreamUrl(): string {
  return `${API_BASE}/api/serial/stream`;
}
