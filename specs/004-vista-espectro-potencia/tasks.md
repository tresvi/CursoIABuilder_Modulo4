---
description: "Task list for vista de espectro de potencia y limpieza de la sidebar (feature 004)"
---

# Tasks: Vista de espectro de potencia y limpieza de la sidebar

**Input**: Design documents from `/specs/004-vista-espectro-potencia/`

**Prerequisites**: plan.md (requerido), spec.md (requerido), research.md, data-model.md,
contracts/api.md, quickstart.md

**Tests**: El Principio I (Test-First, NO-NEGOCIABLE) aplica de lleno: nuevo endpoint de
backend, nuevo cálculo DSP, nuevo componente de render/UI y comportamiento nuevo de
sidebar/`MainPage` son todos cambio de comportamiento. Cada unidad tiene su test escrito
ANTES que la implementación (rojo → verde → refactor).

**Organization**: Agrupadas por fase; numeración `T4xx` para no colisionar con las
features 001 (`T0xx`–`T1xx`), 002 (`T2xx`) y 003 (`T3xx`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencia entre sí)
- **[Story]**: US1, US2 (mapea a spec.md)

---

## Phase 1: Setup

No hay tareas de setup: esta feature no agrega dependencias nuevas (reutiliza
`FftSharp`, ya presente en el backend — research.md D1) ni cambios de configuración.

---

## Phase 2: User Story 1 - Ver el espectro de potencia de la señal (Priority: P1) 🎯 MVP

**Goal**: Activar "Espectro" muestra el espectro de potencia de la señal (ventana
visible) en vez del trazado; se recalcula solo al filtrar; nada de herramientas/marcas
de complejos aplica mientras se ve.

**Independent Test**: Con una señal cargada, activar "Espectro" y verificar que el
gráfico muestra el espectro en vez del trazado; desactivarlo y verificar que vuelve al
trazado (quickstart.md, Escenario 2).

### Tests (escribir primero, deben fallar)

- [X] T400 [P] [US1] Test en `src/backend/ECGViewer.Tests/PowerSpectrumTests.cs`
  (cálculo DSP puro, sin `WebApplicationFactory`, mismo estilo que
  `DspFilterTests.cs`): una señal senoidal pura concentra su potencia cerca de su
  frecuencia conocida; una señal vacía no lanza excepción; una ventana con muy pocas
  muestras se identifica como insuficiente (contrato de `PowerSpectrum`, a definir en
  la implementación).
- [X] T401 [P] [US1] Test en `src/backend/ECGViewer.Tests/SpectrumEndpointTests.cs`
  (mismo estilo que `FilterEndpointTests.cs`, con
  `TestContext.Current.CancellationToken` desde el inicio): `POST /api/spectrum` con
  una señal válida devuelve 200 con `points` ordenados por frecuencia creciente hasta
  `fs/2`; señal vacía devuelve 400 `INVALID_SIGNAL`; ventana con muy pocas muestras
  devuelve 400 `INSUFFICIENT_SAMPLES` (contracts/api.md).
- [ ] T402 [P] [US1] Test en `src/frontend/src/api/spectrumApi.test.ts` (mismo estilo
  que `filterApi` si tiene test, o análogo a como se testea `applyFilter`): `computeSpectrum(signal)` llama a `POST /api/spectrum`
  y devuelve `SpectrumResult`; propaga el error de la API si la respuesta no es 200.
- [ ] T403 [P] [US1] Test en `src/frontend/src/render/drawSpectrum.test.ts` (mismo
  patrón `recordingCtx` que `drawSignal.test.ts`/`drawComplexMarks.test.ts`): dibuja el
  espectro reutilizando `createScale`/`ecgScale.ts` (research.md D4); no lanza error
  con `points` vacío.
- [ ] T404 [P] [US1] Test en `src/frontend/src/components/SpectrumChart.test.tsx`:
  renderiza el canvas (`data-testid` propio) sin manejadores de puntero ni props de
  herramientas/marcadores/marcas de complejos (a diferencia de `ECGChart`).
- [ ] T405 [P] [US1] Test en `src/frontend/src/components/layout/Sidebar.test.tsx`:
  aparece un botón "Espectro" en "Diagnósticos" (junto a "Detec. Complejos"); está
  deshabilitado sin señal cargada; el click invoca `onToggleSpectrum`.
- [ ] T406 [P] [US1] Tests en `src/frontend/src/pages/MainPage.test.tsx`: activar
  "Espectro" con una señal cargada muestra `SpectrumChart` en vez de `ECGChart` (por
  `data-testid`) tras pasar por el estado de carga; con "Espectro" activo, aplicar un
  filtro (con `applyFilter` mockeado, mismo patrón que la feature 003) recalcula solo;
  con "Detec. Complejos" y "Espectro" activos a la vez, no aparece `ECGChart` (y por
  ende ninguna marca); sobre una ventana con muy pocas muestras, se muestra un
  `role="alert"` en vez del gráfico de espectro.

### Implementación

- [X] T407 [US1] `src/backend/ECGViewer.Api/Models/ApiModels.cs`: agregar
  `SpectrumPointDto(double Frequency, double Power)`, `SpectrumDto(IReadOnlyList<SpectrumPointDto> Points)`,
  `SpectrumRequest(SignalDto Signal)`, `SpectrumResponse(SpectrumDto Spectrum)`, y
  `ErrorCodes.InsufficientSamples`.
- [X] T408 [US1] `src/backend/ECGViewer.Api/Dsp/PowerSpectrum.cs`: cálculo del espectro
  de potencia vía `FftSharp` (reutiliza `SignalMath.ResolveFs`). Depende de T407 (usa
  los DTOs). Hace pasar T400.
- [X] T409 [US1] `src/backend/ECGViewer.Api/Endpoints/SpectrumEndpoints.cs`:
  `POST /api/spectrum` — valida señal vacía (`InvalidSignal`) y ventana insuficiente
  (`InsufficientSamples`, mismo estilo que `SignalFilter.Validate`), llama a
  `PowerSpectrum`. Depende de T407, T408. Hace pasar T401.
- [X] T410 [US1] `src/backend/ECGViewer.Api/Program.cs`: registrar
  `app.MapSpectrumEndpoints()`. Depende de T409.
- [ ] T411 [P] [US1] `src/frontend/src/api/spectrumApi.ts`: `computeSpectrum(signal): Promise<SpectrumResult>`
  (mismo patrón que `filterApi.ts`/`applyFilter`). Hace pasar T402.
- [ ] T412 [P] [US1] `src/frontend/src/render/drawSpectrum.ts`: dibuja los
  `SpectrumPoint[]` reutilizando `createScale`/`plotRect` de `ecgScale.ts` (research.md
  D4, sin sistema de escala paralelo). Hace pasar T403.
- [ ] T413 [US1] `src/frontend/src/components/SpectrumChart.tsx`: canvas único (sin
  capa overlay ni manejadores de puntero, a diferencia de `ECGChart` — research.md D3),
  llama a `drawSpectrum`. Depende de T412. Hace pasar T404.
- [ ] T414 [US1] `src/frontend/src/components/layout/Sidebar.tsx`: agregar el botón
  "Espectro" en la sección "Diagnósticos" (props nuevas `spectrumActive`,
  `spectrumStatus`, `onToggleSpectrum`), sin tocar todavía los botones de filtro ni
  "Restaurar" (eso es US2/Phase 3). Hace pasar T405.
- [ ] T415 [US1] `src/frontend/src/pages/MainPage.tsx`: estado
  `spectrumOn`/`spectrum`/`spectrumBusy`/`spectrumError` (ciclo
  `idle → busy → ready/error` de data-model.md, patrón de `filterBusy`/`filterError`
  ya existente — NO el Worker de la feature 003, research.md D5); efecto sobre
  `[spectrumOn, working, window]` que llama `computeSpectrum` con las muestras de la
  ventana visible; renderiza `SpectrumChart` en vez de `ECGChart` cuando `spectrumOn`
  (nunca ambos a la vez); aviso `role="alert"` en `spectrumError`. Depende de T410,
  T411, T413, T414. Hace pasar T406.

**Checkpoint**: US1 funciona de punta a punta de forma independiente (quickstart
Escenarios 2, 3, 4 y 5).

---

## Phase 3: User Story 2 - Sidebar despejada: solo diagnósticos (Priority: P2)

**Goal**: La sección "Diagnósticos" solo tiene "Detec. Complejos" y "Espectro"; filtrar
sigue funcionando igual desde el panel de filtro debajo del gráfico.

**Independent Test**: Abrir la sidebar y verificar que "Diagnósticos" ya no lista los
filtros ni "Restaurar"; verificar que aplicar/revertir un filtro desde el panel de
filtro sigue funcionando (quickstart.md, Escenario 1).

### Tests (escribir primero, deben fallar)

- [ ] T416 [P] [US2] Test en `src/frontend/src/components/layout/Sidebar.test.tsx`: la
  sección "Diagnósticos" ya no incluye los botones "Pasa Bajo", "Pasa Alto",
  "Pasa Banda", "Notch" ni "Restaurar" (y sigue teniendo "Detec. Complejos" y
  "Espectro").

### Implementación

- [ ] T417 [US2] `src/frontend/src/components/layout/Sidebar.tsx`: quitar el
  `FILTERS.map(...)` y el `NavItem` "Restaurar" de "Diagnósticos"; quitar de
  `SidebarProps` los props que quedan sin uso (`activeFilterType`, `onSelectFilter`,
  `onRevertFilter`, `hasFilter`) y los imports que queden sin uso (`Undo2`, `Filter`,
  y `Waves`/`Activity` si ya no los usa nada más en el archivo). Depende de T414. Hace
  pasar T416.
- [ ] T418 [US2] `src/frontend/src/pages/MainPage.tsx`: dejar de pasar a `<Sidebar>`
  los props removidos en T417 (`FilterPanel` ya los maneja de forma independiente, sin
  cambios). Depende de T417.

**Checkpoint**: US1 + US2 funcionan juntas de forma independiente (quickstart
Escenario 1); aplicar/revertir un filtro desde el panel de filtro sigue funcionando
exactamente igual que antes (verificado por los tests ya existentes de `MainPage.test.tsx`,
sin necesidad de duplicarlos — SC-004).

---

## Phase 4: Polish & Verificación

- [ ] T419 [P] `dotnet build` / `dotnet test` en `src/backend` — 0 warnings nuevos
  (mismo estándar que la limpieza reciente de xUnit1051).
- [ ] T420 [P] `npm run typecheck` y `npm run lint` en `src/frontend` — 0 warnings.
- [ ] T421 `npm test` (frontend) y `dotnet test` (backend) — toda la suite (existente +
  la nueva de esta feature) en verde.
- [ ] T422 [P] Ejecutar manualmente los 5 escenarios de `quickstart.md` y documentar el
  resultado en `specs/004-vista-espectro-potencia/quickstart-results.md`.
- [ ] T423 [P] Actualizar `docs/Pendientes.md`: agregar una nota bajo "Deteccion de
  señal ECG" y "Caracterizacion espectral..." señalando que ya existe una vista de
  espectro de potencia reutilizable (esta feature) como bloque de partida — sin
  marcarlos como resueltos, porque esos ítems piden además el algoritmo de decisión
  (rQRS, similitud del coseno), que esta feature no implementa.
- [ ] T424 Actualizar `AGENTS.md` con un puntero breve a esta feature (nuevo endpoint
  `/api/spectrum`, `SpectrumChart` como componente separado de `ECGChart`), mismo
  criterio operativo y de extensión usado para la feature 003.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: vacío, no bloquea nada.
- **US1 (Phase 2)**: no depende de nada más; es la única imprescindible para un MVP
  demostrable. Dentro de la fase, T407→T408→T409→T410 son secuenciales (backend);
  T411/T412 son paralelos entre sí; T413 depende de T412; T414 es independiente de
  todo lo de backend; T415 depende de T410, T411, T413 y T414 (integra todo).
- **US2 (Phase 3)**: depende de que T414 (US1) ya haya tocado `Sidebar.tsx`, porque
  edita el mismo archivo justo después.
- **Polish (Phase 4)**: depende de que ambas historias estén completas.

### Parallel Opportunities

- Tests de US1: T400–T406 en paralelo (archivos de test distintos).
- Implementación de US1: T411 y T412 en paralelo entre sí (no dependen uno del otro);
  T414 en paralelo con todo el bloque de backend (T407–T410).
- Polish: T419, T420, T422 y T423 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tests (todos en archivos distintos):
Task: "Test PowerSpectrum en src/backend/ECGViewer.Tests/PowerSpectrumTests.cs"
Task: "Test endpoint en src/backend/ECGViewer.Tests/SpectrumEndpointTests.cs"
Task: "Test spectrumApi en src/frontend/src/api/spectrumApi.test.ts"
Task: "Test drawSpectrum en src/frontend/src/render/drawSpectrum.test.ts"
Task: "Test SpectrumChart en src/frontend/src/components/SpectrumChart.test.tsx"
Task: "Test botón Espectro en src/frontend/src/components/layout/Sidebar.test.tsx"

# Implementación (una vez lista la base):
Task: "Implementar spectrumApi.ts"
Task: "Implementar drawSpectrum.ts"
Task: "Agregar botón Espectro en Sidebar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 2: User Story 1 (backend + frontend completos).
2. **Parar y validar**: correr quickstart.md Escenarios 2, 3, 4 y 5 a mano.
3. Ya es demostrable: activar "Espectro" muestra el espectro de potencia.

### Entrega incremental

1. + US1 → MVP demostrable (ver el espectro, con Detec. Complejos y filtros
   coexistiendo correctamente).
2. + US2 → sidebar despejada, sin pérdida de funcionalidad de filtrado.
3. Polish → verificación cruzada + quickstart-results.md + notas de backlog + AGENTS.md.

### Notas

- Verificar que cada test falla por la razón esperada antes de implementar
  (Principio I).
- T414 (agregar "Espectro") y T417 (quitar filtros/"Restaurar") tocan el mismo archivo
  — implementarlas en ese orden evita reescribir el mismo bloque dos veces.
- Hacer commit después de cada tarea o grupo lógico.
