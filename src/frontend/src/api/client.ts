import { API_BASE } from "./config";

export interface ApiError {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
  }
}

/**
 * Cliente HTTP base contra el backend. Lee `API_BASE` (VITE_API_BASE) y
 * normaliza los errores al formato `{ code, message }` de contracts/api.md.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    let apiError: ApiError = {
      code: "HTTP_ERROR",
      message: `HTTP ${res.status}`,
    };
    try {
      const body = await res.json();
      if (body?.error) apiError = body.error as ApiError;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiRequestError(apiError);
  }

  return (await res.json()) as T;
}
