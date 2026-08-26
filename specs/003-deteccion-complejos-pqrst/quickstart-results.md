# Resultados de validación (quickstart) — Detección y marcado de complejos PQRST

Ejecución de [`quickstart.md`](./quickstart.md) el 2026-08-26. Entorno: .NET 10.0.301, Node 24.
Resumen: **todas las validaciones automatizables pasan**; queda pendiente la confirmación
visual en un navegador real (mismo tipo de limitación que T077/T078 de la feature 001).

## Suites de tests

| Suite | Resultado |
|-------|-----------|
| Backend `dotnet test` (xUnit) | **30 passed** — sin cambios (feature 100% frontend) |
| Frontend `npm test` (Vitest) | **125 passed** (18 nuevos: `complexDetection`, `useComplexDetection`, `complexDetection.worker`, `drawComplexMarks`, `Sidebar`, `MainPage`) |
| Frontend `tsc --noEmit` / ESLint | limpios, 0 warnings (los 4 preexistentes al momento de esta feature se limpiaron después, PR de chore) |
| Frontend `vite build` | OK — `complexDetection.worker` se bundlea como chunk separado |

## Cobertura por escenario de `quickstart.md`

- **Escenario 1** (US1 — marcar complejos, FR-001/002/004/005): cubierto por
  `complexDetection.test.ts` (ubica P/Q/R/S/T sobre una señal limpia) + `drawComplexMarks.test.ts`
  (filtra por `view.tRange`, estilo distinto por punto) + `Sidebar.test.tsx` (sección
  "Diagnósticos", "Detec. Complejos" primero) + `MainPage.test.tsx` ("activar 'Detec. Complejos'
  pasa por 'procesando' y termina activo"). ✅ automatizado.
- **Escenario 2** (US2 — apagar sin alterar / recalcular al filtrar, FR-006/007): cubierto por
  `MainPage.test.tsx` ("desactivar...", BPM idéntico antes/después) y ("...aplicar un filtro
  dispara una nueva detección sola", con `applyFilter` mockeado). ✅ automatizado.
- **Escenario 3** (US3 — aviso de baja confianza, FR-008): cubierto por el 4º caso de
  `complexDetection.test.ts` (tramo ruidoso aislado) y `MainPage.test.tsx` ("avisa cuando un tramo
  de la señal no permite detección confiable"). ✅ automatizado.
- **Escenario 4** (procesando en señales largas, FR-012, Clarification 2026-08-26): el ciclo
  `idle→processing→ready` sin bloquear quien invoca está probado en `useComplexDetection.test.ts`
  (incluye el fallback inline que se usa cuando `Worker` no existe, como en jsdom) y a nivel de
  integración en `MainPage.test.tsx`. **No verificado visualmente en un navegador real** que el
  resto de la interfaz siga respondiendo con una señal larga de verdad — análogo a T077/T078 de la
  feature 001, requiere sesión de navegador manual.

## Nota de diseño verificada en la práctica

`jsdom` no implementa la API `Worker` (confirmado empíricamente: `typeof Worker === "undefined"`
en el entorno de test) ni el canvas 2D (`tests/setup.ts` fuerza `getContext` a `null`). Esto
llevó a dos ajustes respecto del plan original, ambos documentados en `tasks.md`:

1. La detección corre en un Worker real en el navegador, con un **fallback inline** (mismo
   `detectComplexes`, resuelto por microtask) cuando `Worker` no está disponible — esto además
   permite que los tests de integración de `MainPage` ejerciten el ciclo completo sin mocks de
   bajo nivel.
2. No existe (ni existía antes de esta feature, para `drawMarkers`) un test de `ECGChart` que
   verifique dibujado real en canvas; la cobertura equivalente vive en los tests de la función de
   dibujo en aislamiento (`drawComplexMarks.test.ts`) más el comportamiento observable en
   `MainPage.test.tsx`.

## Pendiente

- Confirmación visual en Chrome/Firefox/Edge de: los 5 puntos dibujados correctamente ubicados
  sobre el trazo real (no solo sus coordenadas calculadas), y el estado "procesando" con una señal
  de varios minutos sin que el resto de la UI se sienta trabada.
