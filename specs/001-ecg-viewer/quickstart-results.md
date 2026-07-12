# Resultados de validación (quickstart) — ECGViewer

Ejecución de [`quickstart.md`](./quickstart.md) el 2026-07-12. Entorno: .NET 10.0.301,
Node 24. Resumen: **todas las validaciones automatizables pasan**; quedan dos verificaciones
que requieren un navegador real (T077/T078), documentadas al final.

## Suites de tests

| Suite | Resultado |
|-------|-----------|
| Backend `dotnet test` (xUnit) | **28 passed** (DSP, filtros endpoint, persistencia SQLite, XLSX) |
| Frontend `npm test` (Vitest) | **55 passed** (parseo, HRV, interacción, componentes, benchmarks) |
| Frontend `tsc --noEmit` / ESLint / Prettier | limpios |
| Frontend `vite build` | OK |

## Smoke end-to-end (backend en `http://localhost:5080`)

| Verificación | Esperado | Resultado |
|--------------|----------|-----------|
| `GET /health` | 200 | ✅ 200 |
| `POST /api/filter` (lowpass) | 200 | ✅ 200 |
| `POST /api/filter` (bandpass low≥high) | 400 `INVALID_FILTER_PARAMS` | ✅ 400 |
| `GET /api/study` (sin estudio) | 404 `NOT_FOUND` | ✅ 404 |
| `PUT /api/study` (guardar) | 200 `savedAt` | ✅ 200 |
| `GET /api/study` (restaurar) | 200 estudio completo | ✅ 200 |
| `POST /api/export/xlsx` | archivo `.xlsx` real | ✅ Microsoft Excel 2007+ |
| `POST /api/import/xlsx` (round-trip) | 200 con misma señal | ✅ 200 |
| CORS preflight desde `:5173` | 204 | ✅ 204 |

## Cobertura por historia (AC del spec)

- **US1** (AC-01/02/03/04/10): parseo CSV válido/ inválido/ multicanal y escala X=s/Y=mV — tests
  `csvParse`, `ecgScale`, `MainPage` (carga y rechazo multicanal). ✅
- **US2** (AC-18/19, FR-006, SC-004): HRV solo sobre la ventana; "—" con <2 latidos — tests
  `rPeakDetection`, `hrv`, `windowMetrics`. ✅
- **US3** (AC-08/09): selección→rango y reset — tests `selectionToRange`, `useTool`. ✅
- **US4** (AC-14/15, SC-009): filtro DSP y reversibilidad exacta — `DspFilterTests`,
  `FilterEndpointTests`, `revertFilter`, `filterCropInterplay` + smoke. ✅
- **US5** (AC-11/12/13): regla y recorte con confirmación — `ruler`, `crop`. ✅
- **US6** (AC-05/06/07): marcadores — `markers`, `useMarkers`. ✅
- **US7** (AC-16/17, SC-006): round-trip XLSX e inválido rechazado — `ExcelTests`,
  `ExcelEndpointTests` + smoke. ✅
- **US8** (AC-20/25/26, SC-005): persistencia solo por "Guardar" y guardia de cierre —
  `StudyRepositoryTests`, `StudyEndpointTests`, `useUnsavedGuard`, `MainPage` (T054a). ✅

## Rendimiento (SC-001/002/003, RNF-01/02/03)

- **SC-002/RNF-03** (métricas < 0.1 s p95): benchmark `tests/perf/metrics.perf.test.ts`. ✅
- **SC-001/RNF-01** (render < 0.1 s p95): benchmark `tests/perf/render.perf.test.ts` mide el
  costo JS de construir el trazo (contexto mock). ✅ La rasterización real de GPU se mide en
  navegador (ver abajo).

## Pendiente de verificación manual en navegador

Estas dos verificaciones requieren un navegador con panel Performance y una matriz de
dispositivos; no son automatizables en este entorno headless.

- **T077 / RNF-02 / SC-003** (≥ 10 fps sin redibujo completo del lienzo durante zoom/filtro/
  arrastre): abrir la app, cargar el fixture de 1 min y medir con el panel *Performance* de
  Chrome que cada cuadro dura < 100 ms y que solo se repinta la capa overlay durante el mouse.
- **T078 / RNF-04 / SC-008** (compatibilidad): ejecutar las operaciones básicas (carga, zoom,
  filtro, marcado) en las últimas 2 versiones estables de Chrome, Firefox y Edge (escritorio),
  Chrome en Android y Safari en iOS.
