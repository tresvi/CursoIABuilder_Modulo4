---
description: "Task list for ECGViewer implementation"
---

# Tasks: ECGViewer — Visor y analizador web de ECG desde CSV/XLSX

**Input**: Design documents from `/specs/001-ecg-viewer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: INCLUIDOS y OBLIGATORIOS. La constitución v1.0.0 fija el Principio I *Test-First
(NO-NEGOCIABLE)*: cada tarea de test se escribe ANTES que su implementación y debe FALLAR primero
(rojo → verde → refactor). Frontend: Vitest. Backend: xUnit. La API de Claude nunca se llama en
tests (no hay uso de Claude en el alcance).

**Organization**: Tareas agrupadas por historia de usuario para implementación y prueba
independientes. Orden de fases por prioridad: P1 → P2 → P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario (US1–US8, mapea a spec.md)
- Rutas exactas incluidas en cada descripción

## Path Conventions (web app, ver plan.md)

- Backend: `src/backend/ECGViewer.Api/`, tests en `src/backend/ECGViewer.Tests/`
- Frontend: `src/frontend/src/`, tests Vitest colocados (`*.test.ts[x]`) o en `src/frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del monorepo y dependencias.

- [X] T001 Crear estructura de carpetas `src/backend/` y `src/frontend/` según plan.md
- [X] T002 Inicializar solución .NET 10 en `src/backend/` con proyectos `ECGViewer.Api` (Minimal API) y `ECGViewer.Tests` (xUnit); agregar NuGet: FftSharp, ClosedXML, DocumentFormat.OpenXml, Microsoft.Data.Sqlite en `src/backend/ECGViewer.Api/ECGViewer.Api.csproj`
- [X] T003 [P] Inicializar proyecto Vite React 19.2 + TypeScript en `src/frontend/` con Vitest + Testing Library en `src/frontend/package.json` y `src/frontend/vitest.config.ts`
- [X] T004 [P] Configurar `VITE_API_BASE` (default `http://localhost:5080`) en `src/frontend/.env` y `src/frontend/src/api/config.ts`
- [X] T005 [P] Configurar linting/formato: ESLint + Prettier en `src/frontend/` y `.editorconfig` / analizadores en `src/backend/`
- [X] T006 [P] Añadir CSV de referencia de 1 minuto en `src/frontend/tests/fixtures/ecg-1min.csv` para benchmarks de rendimiento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura base que TODAS las historias necesitan.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta completar esta fase.

- [X] T007 Configurar `Program.cs` (Minimal API) en `src/backend/ECGViewer.Api/Program.cs`: CORS para `http://localhost:5173` y `:4173`, puerto 5080, DI base y health endpoint
- [X] T008 [P] Crear DTOs comunes y modelo de error uniforme (`SignalDto`, `SampleDto`, `ErrorResponse`) en `src/backend/ECGViewer.Api/Models/`
- [X] T009 [P] Definir tipos de dominio de la señal (`Signal`, `Sample`, `originalSignal`/`workingSignal`, derivación de `fs`) en `src/frontend/src/signal/signalModel.ts`
- [X] T010 [P] Crear cliente HTTP base que lee `VITE_API_BASE` con manejo de errores en `src/frontend/src/api/client.ts`
- [X] T011 [P] Crear shell de la pantalla principal (layout: toolbar, área de gráfico, panel de métricas placeholder) en `src/frontend/src/pages/MainPage.tsx`
- [X] T012 [P] Definir store de estado transitorio de UI (`activeTool`, `showGrid`, `dirty`) con hook `useAppState` en `src/frontend/src/hooks/useAppState.ts`

**Checkpoint**: Base lista — las historias pueden comenzar.

---

## Phase 3: User Story 1 - Cargar y visualizar una señal ECG (Priority: P1) 🎯 MVP

**Goal**: Cargar CSV monocanal válido y dibujarlo en un gráfico (X=s, Y=mV) con rejilla ECG
opcional; rechazar inválidos/multicanal con mensaje.

**Independent Test**: Cargar un CSV válido de un canal y ver la señal con ejes correctos; un
archivo inválido o multicanal se rechaza con mensaje sin dibujar (AC-01..04, AC-10).

### Tests for User Story 1 (escribir primero, deben FALLAR)

- [X] T013 [P] [US1] Tests de parseo/validación CSV (válido, columnas faltantes, no numérico, encabezado malo, vacío, multicanal) en `src/frontend/src/signal/csvParse.test.ts`
- [X] T014 [P] [US1] Tests de geometría de render (mapeo tiempo→X, amplitud→Y, orden temporal) en `src/frontend/src/render/ecgScale.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Implementar parser CSV con validaciones (un canal, tiempo/valor numéricos, encabezado) en `src/frontend/src/signal/csvParse.ts` (FR-001/002)
- [X] T016 [P] [US1] Implementar escalado/coordenadas de la señal en `src/frontend/src/render/ecgScale.ts`
- [X] T017 [US1] Implementar render de la señal y ejes sobre canvas base en `src/frontend/src/render/drawSignal.ts` (FR-003)
- [X] T018 [P] [US1] Implementar rejilla ECG (papel milimetrado) conmutable en `src/frontend/src/render/drawGrid.ts` (FR-004, AC-10)
- [X] T019 [US1] Componente `ECGChart` con canvas de doble capa (base + overlay) en `src/frontend/src/components/ECGChart.tsx` (research.md D1)
- [X] T020 [US1] Componente de carga de archivo + mensajes de error/rechazo (multicanal/ inválido) en `src/frontend/src/components/FileLoader.tsx` (AC-02/03, SC-007)
- [X] T021 [US1] Cablear carga → modelo de señal → render en `MainPage.tsx` y toggle de rejilla en la toolbar

**Checkpoint**: US1 funcional e independientemente testeable (MVP).

---

## Phase 4: User Story 2 - Métricas cardíacas sobre la ventana visible (Priority: P1)

**Goal**: Calcular y mostrar BPM, SDNN, RMSSD, pNN50 solo sobre la ventana visible, recalculando
al cambiar el rango; "no disponible" ("—") cuando no hay latidos suficientes.

**Independent Test**: Con ventana dada, las 4 métricas se calculan solo sobre esa ventana; al
cambiar el rango se recalculan (AC-18/19, FR-006).

### Tests for User Story 2 (escribir primero, deben FALLAR)

- [X] T022 [P] [US2] Tests de detección de picos R sobre señales sintéticas de RR conocido en `src/frontend/src/metrics/rPeakDetection.test.ts`
- [X] T023 [P] [US2] Tests de HRV (BPM/SDNN/RMSSD/pNN50, casos "—" con <2 RR) en `src/frontend/src/metrics/hrv.test.ts`
- [X] T024 [P] [US2] Test de que las métricas usan solo `[fromTime,toTime]` (dos ventanas distintas → valores distintos) en `src/frontend/src/metrics/windowMetrics.test.ts` (SC-004)

### Implementation for User Story 2

- [X] T025 [US2] Implementar detección de picos R (Pan-Tompkins simplificado) en `src/frontend/src/metrics/rPeakDetection.ts` (research.md D3)
- [X] T026 [US2] Implementar cálculo HRV con manejo de "no disponible" en `src/frontend/src/metrics/hrv.ts` (FR-006)
- [X] T027 [P] [US2] Modelo `VisibleWindow` y hook `useVisibleWindow` en `src/frontend/src/hooks/useVisibleWindow.ts`
- [X] T028 [US2] Orquestar recorte por ventana → picos → métricas en `src/frontend/src/metrics/windowMetrics.ts`
- [X] T029 [US2] Componente `MetricsPanel` que muestra las 4 métricas ("—" cuando null) y se recalcula al cambiar ventana en `src/frontend/src/components/MetricsPanel.tsx`

**Checkpoint**: US1 + US2 funcionan independientemente. MVP completo (P1).

---

## Phase 5: User Story 3 - Navegar la señal con zoom (Priority: P2)

**Goal**: Zoom por arrastre horizontal (selección abarca todo Y) y "Restablecer zoom".

**Independent Test**: Arrastrar con Zoom activo acerca al rango; "Restablecer zoom" vuelve a la
señal completa (AC-08/09).

### Tests for User Story 3 (escribir primero, deben FALLAR)

- [X] T030 [P] [US3] Tests de conversión selección-pixel → rango temporal `[fromTime,toTime]` en `src/frontend/src/render/selectionToRange.test.ts`
- [X] T031 [P] [US3] Tests del hook de herramienta activa (cursor lupa, estado zoom) en `src/frontend/src/hooks/useTool.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Implementar `selectionToRange` (pixel→segundos, clamp) en `src/frontend/src/render/selectionToRange.ts`
- [X] T033 [P] [US3] Hook `useTool` (herramienta activa + cursor por herramienta) en `src/frontend/src/hooks/useTool.ts`
- [X] T034 [US3] Overlay de selección de zoom (banda vertical completa en Y) y aplicar rango a `VisibleWindow` en `src/frontend/src/components/ECGChart.tsx` (AC-08)
- [X] T035 [US3] Acción "Restablecer zoom" en la toolbar que restaura `[inicio,fin]` (AC-09)

**Checkpoint**: US3 independiente; al cambiar la ventana, las métricas de US2 se recalculan.

---

## Phase 6: User Story 4 - Filtrar la señal y poder revertir (Priority: P2)

**Goal**: Aplicar filtro DSP (pasa bajo/alto/banda/notch) actualizando el gráfico sin salir de
pantalla; revertir exactamente a la señal original.

**Independent Test**: Aplicar filtro actualiza el gráfico; revertir devuelve la señal exacta
original (AC-14/15, SC-009).

### Tests for User Story 4 (escribir primero, deben FALLAR)

- [X] T036 [P] [US4] Tests xUnit de filtros DSP (respuesta conocida por tipo, validación de cortes/Nyquist) en `src/backend/ECGViewer.Tests/DspFilterTests.cs`
- [X] T037 [P] [US4] Test de contrato `POST /api/filter` (request/response, 400 params inválidos) en `src/backend/ECGViewer.Tests/FilterEndpointTests.cs`
- [X] T038 [P] [US4] Test frontend de reversibilidad (working==original tras revertir) en `src/frontend/src/signal/revertFilter.test.ts`

### Implementation for User Story 4

- [X] T039 [US4] Implementar filtros DSP con FftSharp (lowpass/highpass/bandpass/notch) en `src/backend/ECGViewer.Api/Dsp/SignalFilter.cs` (FR-007)
- [X] T040 [US4] Endpoint `POST /api/filter` con validación de parámetros en `src/backend/ECGViewer.Api/Endpoints/FilterEndpoints.cs` (contracts/api.md)
- [X] T041 [P] [US4] Modelo `FilterConfig` (frontend) + cliente `applyFilter` en `src/frontend/src/api/filterApi.ts`
- [X] T042 [US4] Lógica no destructiva: guardar `originalSignal` y revertir working al original en `src/frontend/src/signal/signalModel.ts` (FR-008/019, Principio II)
- [X] T043 [US4] Panel de filtro (tipo + frecuencias de corte) + botón revertir en `src/frontend/src/components/FilterPanel.tsx` (AC-14/15)

**Checkpoint**: US4 independiente; filtrado listo para mejorar detección de picos de US2.

---

## Phase 7: User Story 5 - Medir y recortar con el mouse (Priority: P2)

**Goal**: Regla (Δt/Δamplitud en vivo, sin alterar señal) y Recorte con confirmación previa.

**Independent Test**: Regla muestra Δt/Δamplitud y no altera la señal; Recorte selecciona, pide
confirmación y solo recorta si se acepta (AC-11/12/13).

### Tests for User Story 5 (escribir primero, deben FALLAR)

- [X] T044 [P] [US5] Tests de cálculo de la regla (Δt en s, Δamplitud en mV) en `src/frontend/src/metrics/ruler.test.ts`
- [X] T045 [P] [US5] Tests de recorte (genera nueva señal acotada; cancelar = intacta; reversibilidad) en `src/frontend/src/signal/crop.test.ts`
- [X] T045a [P] [US5] Test de interacción filtro↔recorte: revertir un filtro sobre una señal recortada devuelve el tramo conservado sin filtro, y recortar sobre señal filtrada no impide revertir el filtro en `src/frontend/src/signal/filterCropInterplay.test.ts` (FR-019, spec.md edge case)

### Implementation for User Story 5

- [X] T046 [US5] Implementar cálculo de la regla en `src/frontend/src/metrics/ruler.ts` (FR-009)
- [X] T047 [US5] Overlay de regla en vivo (cursor regla) en `src/frontend/src/components/ECGChart.tsx` (AC-11)
- [X] T048 [P] [US5] Modelo `Crop` y función de recorte no destructivo en `src/frontend/src/signal/crop.ts` (FR-010, Principio II)
- [X] T049 [US5] Overlay de selección de recorte (cursor tijera, región a conservar resaltada, sin aplicar) en `src/frontend/src/components/ECGChart.tsx` (AC-12)
- [X] T050 [P] [US5] Componente `ConfirmDialog` reutilizable en `src/frontend/src/components/ConfirmDialog.tsx`
- [X] T051 [US5] Flujo de confirmación de recorte: aceptar → nueva señal acotada; cancelar → intacta (AC-13)
- [X] T051a [US5] Componer derivación `original → filtro → recorte` de forma reversible en `src/frontend/src/signal/signalModel.ts`: revertir el filtro reconstruye desde el original conservado aplicando el recorte vigente (satisface T045a, FR-019, data-model.md diagrama de derivación)

**Checkpoint**: US5 independiente; recorte reversible respecto del original.

---

## Phase 8: User Story 8 - Guardar explícitamente y proteger cambios (Priority: P2)

**Goal**: Persistir el estudio único solo con "Guardar"; alertar ante cierre/recarga con cambios
pendientes; restaurar el estudio.

**Independent Test**: Cambios no persisten sin "Guardar"; con "Guardar" persisten; cerrar con
cambios pendientes muestra alerta (AC-20/25/26, SC-005).

### Tests for User Story 8 (escribir primero, deben FALLAR)

- [X] T052 [P] [US8] Tests xUnit del repositorio SQLite (upsert reemplaza estudio único, restore) en `src/backend/ECGViewer.Tests/StudyRepositoryTests.cs`
- [X] T053 [P] [US8] Tests de contrato `GET`/`PUT /api/study` (200, 404 sin estudio) en `src/backend/ECGViewer.Tests/StudyEndpointTests.cs`
- [X] T054 [P] [US8] Test del guardia de cambios sin guardar (`dirty` → confirmación) en `src/frontend/src/hooks/useUnsavedGuard.test.ts`
- [X] T054a [P] [US8] Test de persistencia explícita: ninguna mutación (marcador/filtro/recorte) invoca `saveStudy` sin acción "Guardar"; solo "Guardar" dispara `PUT /api/study` en `src/frontend/src/api/studyApi.test.ts` (FR-016/017, Principio III, SC-005)

### Implementation for User Story 8

- [X] T055 [US8] Esquema SQLite y repositorio de estudio único (upsert/get) en `src/backend/ECGViewer.Api/Persistence/StudyRepository.cs` (FR-021)
- [X] T056 [US8] Endpoints `GET /api/study` y `PUT /api/study` en `src/backend/ECGViewer.Api/Endpoints/StudyEndpoints.cs` (contracts/api.md)
- [X] T057 [P] [US8] Modelo `SavedStudy` (frontend) + cliente `getStudy`/`saveStudy` en `src/frontend/src/api/studyApi.ts`
- [X] T058 [US8] Acción "Guardar" (serializa señal+marcadores+filtro+recorte, marca `dirty=false`) en `MainPage.tsx` (FR-016, AC-20)
- [X] T059 [P] [US8] Hook `useUnsavedGuard` con `beforeunload` cuando `dirty=true` en `src/frontend/src/hooks/useUnsavedGuard.ts` (FR-018, AC-26)
- [X] T060 [US8] Restaurar estudio al iniciar (reconstruir working aplicando filtro/recorte) en `MainPage.tsx` (FR-021)

**Checkpoint**: Todas las P2 completas; garantía de persistencia explícita en vigor. Nota: US8
persiste señal + filtro (US4) + recorte (US5). La integración de **marcadores** (US6, P3) en el
guardado se cierra más adelante en **T067**, ya que US6 va después por prioridad; hasta entonces
`markers` se serializa como lista vacía sin romper el contrato de `PUT /api/study`.

---

## Phase 9: User Story 6 - Marcar eventos sobre el gráfico (Priority: P3)

**Goal**: Crear, editar y eliminar marcadores anclados al eje temporal.

**Independent Test**: Crear marcador con clic, editar etiqueta y eliminar, viendo cada cambio en
el gráfico durante la sesión (AC-05/06/07).

### Tests for User Story 6 (escribir primero, deben FALLAR)

- [X] T061 [P] [US6] Tests del modelo de marcadores (crear anclado a tiempo, editar label, eliminar) en `src/frontend/src/signal/markers.test.ts`

### Implementation for User Story 6

- [X] T062 [US6] Modelo `EventMarker` y operaciones (add/edit/remove) en `src/frontend/src/signal/markers.ts` (FR-011/012/013)
- [X] T063 [P] [US6] Hook `useMarkers` (estado de sesión, marca `dirty`) en `src/frontend/src/hooks/useMarkers.ts`
- [X] T064 [US6] Herramienta "Marcar": clic sobre el eje temporal crea marcador en `src/frontend/src/components/ECGChart.tsx` (AC-05)
- [X] T065 [P] [US6] Capa de render de marcadores sobre el overlay en `src/frontend/src/render/drawMarkers.ts`
- [X] T066 [US6] UI de edición de etiqueta y eliminación de marcador en `src/frontend/src/components/MarkerEditor.tsx` (AC-06/07)
- [X] T067 [US6] Integrar marcadores en el guardado (US8) y en `dirty`

**Checkpoint**: US6 independiente.

---

## Phase 10: User Story 7 - Importar y exportar en Excel (Priority: P3)

**Goal**: Exportar la señal a `.xlsx` e importar señales `.xlsx` con la estructura esperada.

**Independent Test**: Exportar y reimportar conserva tiempo/señal; `.xlsx` inválido se rechaza
(AC-16/17, SC-006).

### Tests for User Story 7 (escribir primero, deben FALLAR)

- [ ] T068 [P] [US7] Tests xUnit de export/import XLSX (round-trip sin pérdida, estructura inválida, multicanal) en `src/backend/ECGViewer.Tests/ExcelTests.cs`
- [ ] T069 [P] [US7] Tests de contrato `POST /api/import/xlsx` y `POST /api/export/xlsx` en `src/backend/ECGViewer.Tests/ExcelEndpointTests.cs`

### Implementation for User Story 7

- [ ] T070 [US7] Servicio de export XLSX (ClosedXML) en `src/backend/ECGViewer.Api/Excel/ExcelExporter.cs` (FR-014)
- [ ] T071 [US7] Servicio de import XLSX con validaciones (un canal, tiempo/valor) en `src/backend/ECGViewer.Api/Excel/ExcelImporter.cs` (FR-015, AC-17)
- [ ] T072 [US7] Endpoints `POST /api/export/xlsx` y `POST /api/import/xlsx` (multipart) en `src/backend/ECGViewer.Api/Endpoints/ExcelEndpoints.cs` (contracts/api.md)
- [ ] T073 [P] [US7] Cliente `exportXlsx`/`importXlsx` (multipart, descarga binaria) en `src/frontend/src/api/excelApi.ts`
- [ ] T074 [US7] Botones Importar/Exportar XLSX en la toolbar, reusando el pipeline de US1 tras importar (AC-17)

**Checkpoint**: Todas las historias funcionales.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Rendimiento, compatibilidad y validación final.

- [X] T075 [P] Benchmark de render < 0.1 s p95 (20 cargas, archivo de 1 min) en `src/frontend/tests/perf/render.perf.test.ts` (SC-001/RNF-01)
- [X] T076 [P] Benchmark de cálculo de métricas < 0.1 s p95 (20 mediciones) en `src/frontend/tests/perf/metrics.perf.test.ts` (SC-002/RNF-03)
- [ ] T077 Verificar ≥ 10 fps sin redibujo completo durante interacción (documentar medición con panel Performance) (SC-003/RNF-02)
- [ ] T078 [P] Verificación de compatibilidad de operaciones básicas en Chrome/Firefox/Edge, Chrome Android, Safari iOS (SC-008/RNF-04)
- [ ] T079 [P] Actualizar documentación de ejecución/uso en `docs/` y `README` del frontend/backend
- [X] T080 Refactor y limpieza con la suite en verde (Principio I)
- [ ] T081 Ejecutar `quickstart.md` de punta a punta (US1–US8) y registrar resultados

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — inicio inmediato.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias.
- **User Stories (Phase 3+)**: dependen de Foundational. Orden por prioridad P1 → P2 → P3;
  con capacidad, las historias pueden ir en paralelo tras Foundational.
- **Polish (Phase 11)**: depende de las historias deseadas completas.

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Sin dependencias de otras historias. Base de render.
- **US2 (P1)**: tras Foundational. Usa la señal y ventana; testeable de forma independiente.
- **US3 (P2)**: tras Foundational. Al mover la ventana alimenta el recálculo de US2 (integración
  suave, no bloqueante).
- **US4 (P2)**: tras Foundational. Backend independiente; mejora la señal de US2.
- **US5 (P2)**: tras Foundational. Regla/recorte independientes; recorte reversible (Principio II).
- **US8 (P2)**: tras Foundational. Persiste señal + filtro (US4) + recorte (US5). Los marcadores
  (US6, P3) se incorporan al guardado en **T067**, dentro de la fase de US6 (posterior por
  prioridad); US8 no depende de US6 para ser testeable.
- **US6 (P3)**: tras Foundational. Marcadores independientes; T067 los integra en el guardado de
  US8 (cierra la integración diferida señalada en el checkpoint de US8).
- **US7 (P3)**: tras Foundational. Import/export independiente; import reutiliza pipeline de US1.

### Within Each User Story

- Los tests se escriben y FALLAN antes de implementar (Principio I).
- Modelos → servicios → endpoints/UI → integración.
- Historia completa antes de pasar a la siguiente prioridad.

### Parallel Opportunities

- Setup: T003, T004, T005, T006 en paralelo (tras T001/T002).
- Foundational: T008, T009, T010, T011, T012 en paralelo.
- Dentro de cada historia, los tests marcados [P] corren en paralelo; los modelos [P] también.
- Backend (US4, US7, US8) y frontend pueden avanzar en paralelo por distintas personas.

---

## Parallel Example: User Story 2

```bash
# Tests de US2 juntos (deben fallar primero):
Task: "rPeakDetection.test.ts"      # T022
Task: "hrv.test.ts"                 # T023
Task: "windowMetrics.test.ts"       # T024
```

---

## Implementation Strategy

### MVP First (P1: US1 + US2)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar US1 (cargar + visualizar) → validar independientemente.
3. Completar US2 (métricas sobre ventana visible) → validar.
4. **STOP y VALIDAR**: MVP entrega visualización + métricas (el núcleo del producto).

### Incremental Delivery

1. Setup + Foundational → base lista.
2. + US1 → demo (ver señal).
3. + US2 → demo (métricas). **MVP (P1)**.
4. + US3, US4, US5, US8 (P2) → cada una testeable e integrable.
5. + US6, US7 (P3) → marcadores e interoperabilidad XLSX.

### Parallel Team Strategy

Tras Foundational: Dev A → frontend render/métricas (US1/US2/US3); Dev B → backend DSP/XLSX/SQLite
(US4/US7/US8); Dev C → interacción de mouse y marcadores (US5/US6). Integrar por checkpoints.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- [Story] mapea la tarea a su historia para trazabilidad.
- Verificar que cada test falla antes de implementar (rojo → verde → refactor).
- Commit tras cada tarea o grupo lógico; `dotnet test` y `npm test` en verde antes de integrar.
- Principios activos: II (señal original inmutable), III (persistencia explícita), IV (métricas
  sobre ventana visible), V (rendimiento de render).
