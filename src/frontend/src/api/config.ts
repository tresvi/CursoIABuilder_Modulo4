/** Base de la API del backend. Configurable vía VITE_API_BASE (AGENTS.md). */
export const API_BASE: string =
  (import.meta.env?.VITE_API_BASE as string | undefined) ??
  "http://localhost:5080";
