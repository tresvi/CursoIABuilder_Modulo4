---
description: "Task list for detección y marcado de complejos PQRST (feature 003)"
---

# Tasks: Detección y marcado de complejos PQRST

**Input**: Design documents from `/specs/003-deteccion-complejos-pqrst/`

**Prerequisites**: plan.md (requerido), spec.md (requerido), research.md, data-model.md, quickstart.md
(no hay `contracts/`: la feature no agrega interfaces externas — ver plan.md)

**Tests**: El Principio I (Test-First, NO-NEGOCIABLE) aplica de lleno: toda esta feature es
comportamiento/lógica de dominio nuevo (detección, dibujo, estado de la herramienta), no
presentación pura. Cada unidad de comportamiento tiene su test escrito ANTES que la
implementación (rojo → verde → refactor).

**Organization**: Agrupadas por fase; numeración `T3xx` para no colisionar con las features 001
(`T0xx`–`T1xx`) y 002 (`T2xx`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencia entre sí)
- **[Story]**: US1, US2, US3 (mapea a spec.md)

---

## Phase 1: Setup

No hay tareas de setup: esta feature no agrega dependencias nuevas ni cambios de configuración
(research.md D1/D2 — se reutiliza React, el Canvas 2D propio y la API nativa `Worker` del
navegador, sin librerías nuevas).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Motor de detección, dibujo y punto de entrada en la UI que las 3 historias
comparten. Ninguna historia puede empezar a integrarse en `MainPage`/`ECGChart` sin esto.

### Tests (escribir primero, deben fallar)

- [X] T300 [P] Test de `detectComplexes` (algoritmo puro) en
  `src/frontend/src/metrics/complexDetection.test.ts`: sobre una señal típica limpia devuelve un
  `PqrstComplex` por cada R ya detectado por `detectRPeaks`, con los 5 puntos (P, Q, R, S, T)
  ubicados dentro del rango de la señal; sobre una señal sin picos R devuelve `complexes: []` y
  `lowConfidenceRanges` cubriendo toda la señal; sobre una señal más corta que un latido no
  lanza error y devuelve `complexes: []`.
- [X] T301 [P] Test del wrapper de Worker. **Ajuste de diseño durante la implementación**:
  jsdom no implementa la API `Worker`, así que se dividió en dos tests inyectables/aislados en
  vez de instanciar un `Worker` real: (a) `src/frontend/src/workers/complexDetection.worker.test.ts`
  — el entry point recibe `{samples, fs, durationSec}` vía `self.onmessage` y responde con
  `detectComplexes(...)` vía `self.postMessage`; (b) `src/frontend/src/hooks/useComplexDetection.test.ts`
  — el hook expone `idle → processing → ready` recibiendo un worker inyectado (fake en tests, uno
  real vía `new Worker(...)` en producción), sin bloquear quien lo invoca.
- [X] T302 [P] Test de `drawComplexMarks` en `src/frontend/src/render/drawComplexMarks.test.ts`:
  solo dibuja los puntos cuyo `time` cae dentro de `view.tRange` (igual criterio que
  `drawMarkers.test.ts`); usa un estilo (color/forma) distinto entre sí para P/Q/R/S/T y distinto
  del usado por `drawMarkers` (FR-011).
- [X] T303 [P] Test de interacción en `src/frontend/src/components/layout/Sidebar.test.tsx`: la
  sección antes titulada "Filtros" ahora se llama "Diagnósticos"; su primer ítem es
  "Detec. Complejos"; el botón está deshabilitado sin señal cargada (`hasSignal=false`); el botón
  puede mostrarse `active` al mismo tiempo que un filtro de señal está `active` (no son
  mutuamente excluyentes, FR-007).

### Implementación

- [X] T304 Implementar `src/frontend/src/metrics/complexDetection.ts`: tipos
  `PqrstPoint`, `PqrstComplex`, `ComplexDetectionResult` (data-model.md) y la función
  `detectComplexes(signal, fs)` que reutiliza `detectRPeaks` como ancla y localiza Q/S (extremos
  locales en ventanas cortas antes/después de cada R) y P/T (extremos locales en ventanas más
  amplias, escaladas por el RR local — research.md D3). Hace pasar T300.
- [X] T305 [P] Implementar `src/frontend/src/workers/complexDetection.worker.ts` (entry point
  del Worker que llama a `detectComplexes`) y `src/frontend/src/hooks/useComplexDetection.ts`
  (wrapper de invocación desde el hilo principal, con la fábrica de Worker inyectable). Depende
  de T304. Hace pasar T301.
- [X] T306 [P] Implementar `src/frontend/src/render/drawComplexMarks.ts`
  (dibuja los `PqrstPoint` del `PqrstComplex[]` visible sobre el lienzo overlay). Depende de
  T304 (tipos). Hace pasar T302.
- [X] T307 [P] Renombrar la sección y agregar el botón en
  `src/frontend/src/components/layout/Sidebar.tsx`: `"Filtros"` → `"Diagnósticos"`,
  `"Detec. Complejos"` primero, props nuevas `complexDetectionActive`,
  `complexDetectionStatus: "idle" | "processing" | "ready"`, `onToggleComplexDetection`. Hace
  pasar T303.

**Checkpoint**: motor de detección + Worker + dibujo + botón de entrada existen y están
probados de forma aislada; todavía no están conectados en `MainPage`/`ECGChart`.

---

## Phase 3: User Story 1 - Marcar los complejos PQRST del trazado (Priority: P1) 🎯 MVP

**Goal**: Activar "Detec. Complejos" marca los 5 puntos de cada latido sobre toda la señal
cargada, y las marcas siguen correctamente ubicadas al hacer zoom/pan.

**Independent Test**: Con una señal cargada, activar "Detec. Complejos" y verificar marcas sobre
todo el trazado, incluso al desplazarse/zoomear (quickstart.md, Escenario 1).

### Tests (escribir primero, deben fallar)

- [X] T308 [P] [US1] **Ajuste de diseño**: `tests/setup.ts` fuerza
  `HTMLCanvasElement.getContext` a devolver `null` en todo este proyecto (jsdom no implementa
  canvas 2D), así que `paintOverlay` nunca llega a dibujar en los tests — por eso tampoco existe
  (ni existía antes de esta feature) un `ECGChart.test.tsx` que verifique dibujado real; el mismo
  criterio ya vale para `drawMarkers`. La cobertura equivalente y honesta quedó repartida en: (a)
  `drawComplexMarks.test.ts` (T302, ya verde) prueba el filtrado por `view.tRange` y el estilo; (b)
  los tests de integración de `MainPage.test.tsx` (T309) verifican el flujo real end-to-end a
  través de los afordances visibles (botón de la sidebar), que es lo único observable en jsdom.
- [X] T309 [P] [US1] Tests en `src/frontend/src/pages/MainPage.test.tsx`: activar
  "Detec. Complejos" con una señal cargada pasa a `aria-pressed=true` de inmediato y termina
  habilitado (pasa por processing→ready); las métricas de ventana no cambian por activar/desactivar
  la herramienta.

### Implementación

- [X] T310 [US1] Modificado `src/frontend/src/components/ECGChart.tsx`: nueva prop
  `complexMarks: PqrstComplex[] = []`, se llama `drawComplexMarks(ctx, complexMarks, view)` dentro
  de `paintOverlay` junto a `drawMarkers`, agregada a las dependencias del `useCallback`.
- [X] T311 [US1] Modificado `src/frontend/src/pages/MainPage.tsx`: estado `complexDetectionOn`
  (intención del usuario) + `useComplexDetection()` (estado `idle→processing→ready` del hook,
  T305); un `useEffect` sobre `[complexDetectionOn, working]` dispara `runComplexDetection(working)`
  cada vez que la señal mostrada cambia mientras la herramienta está activa — esto resuelve **a la
  vez** US1 (detectar sobre toda la señal) y US2 (recalcular tras filtrar, ver Phase 4 más abajo),
  porque el mismo efecto cubre ambos casos sin lógica separada. `complexMarks` se pasa a `ECGChart`
  y las props nuevas a `Sidebar`.

**Checkpoint**: US1 funciona de punta a punta de forma independiente (quickstart Escenarios 1 y 4).

---

## Phase 4: User Story 2 - Apagar la detección sin alterar la señal (Priority: P2)

**Goal**: Desactivar la herramienta limpia las marcas sin tocar la señal ni las métricas;
aplicar/cambiar/restaurar un filtro con la herramienta activa recalcula solo.

**Independent Test**: Activar, desactivar y comparar señal/métricas antes-después; activar +
aplicar un filtro y verificar que las marcas se recalculan sin acción manual (quickstart.md,
Escenario 2).

### Tests (escribir primero, deben fallar)

- [X] T312 [P] [US2] Test en `MainPage.test.tsx`: desactivar "Detec. Complejos" vuelve
  `aria-pressed=false`, y el BPM de la ventana visible antes/después es idéntico (FR-006, SC-003).
- [X] T313 [P] [US2] Test en `MainPage.test.tsx` (con `applyFilter` mockeado para no requerir
  red): con "Detec. Complejos" activo, aplicar un filtro dispara sola una nueva corrida
  (processing→ready) sin reactivar la herramienta (FR-007).

### Implementación

- [X] T314 [US2] La desactivación quedó resuelta en `handleToggleComplexDetection` (T311): al
  apagar, llama `resetComplexDetection()` (vuelve a `idle`, `complexMarks` queda vacío) sin tocar
  `derivation`.
- [X] T315 [US2] El recalculo tras filtrar quedó resuelto por el mismo `useEffect` de T311 (no
  hizo falta lógica separada): al aplicar/cambiar/restaurar un filtro, `working` cambia de
  identidad (ver `deriveWorking`/`applyFilter` en `signalModel.ts`) y el efecto dispara una nueva
  corrida automáticamente.

**Checkpoint**: US1 + US2 funcionan juntas de forma independiente (quickstart Escenario 2).

---

## Phase 5: User Story 3 - Aviso cuando la señal no permite una detección confiable (Priority: P3)

**Goal**: Cuando la señal (o un tramo) no permite detectar con confianza, se informa en vez de
dibujar marcas arbitrarias.

**Independent Test**: Activar la herramienta sobre una señal sin latidos reconocibles (o
parcialmente reconocible) y verificar el aviso en vez de marcas erróneas (quickstart.md,
Escenario 3).

### Tests (escribir primero, deben fallar)

- [X] T316 [P] [US3] Cubierto ya por T300: el 4º test de `complexDetection.test.ts`
  ("marca como baja confianza solo el tramo ruidoso...") sobre dos latidos limpios + 3s de
  silencio + dos latidos limpios ya verifica exactamente esto (`complexes` = 4 latidos de los
  tramos limpios, `lowConfidenceRanges` = el hueco intermedio).
- [X] T317 [P] [US3] Test en `MainPage.test.tsx` ("avisa cuando un tramo de la señal no permite
  detección confiable"): con dos latidos + hueco de silencio + dos latidos, al activar
  "Detec. Complejos" aparece `role="alert"` con el aviso.

### Implementación

- [X] T318 [US3] No hizo falta ajustar `complexDetection.ts`: el algoritmo de T304 ya cubre el
  caso (ver T316).
- [X] T319 [US3] Agregado en `MainPage.tsx` (junto con T311, antes de las Fases 4/5 por ser
  parte del mismo bloque de wiring): mensaje `role="alert"` condicionado a
  `complexResult.lowConfidenceRanges.length > 0`, con el mismo patrón de `FileLoader.tsx`/
  `FilterPanel.tsx`.

**Checkpoint**: Las 3 historias funcionan, independiente y en conjunto (quickstart Escenario 3).

---

## Phase 6: Polish & Verificación

- [X] T320 [P] `npm run typecheck` y `npm run lint` limpios en `src/frontend`.
- [X] T321 `npm test` en `src/frontend` — toda la suite (existente + la nueva de esta feature)
  en verde; `dotnet test` en `src/backend` sin cambios esperados (feature 100% frontend).
- [X] T322 [P] Ejecutar manualmente los 4 escenarios de `quickstart.md` y documentar el
  resultado en `specs/003-deteccion-complejos-pqrst/quickstart-results.md` (mismo patrón que
  `specs/001-ecg-viewer/quickstart-results.md`).
- [X] T323 Actualizar `docs/Pendientes.md`: marcar como resuelto el ítem "Detección automática
  de complejos" (y la mención equivalente dentro del backlog de `Analisis de Filtros.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: vacío, no bloquea nada.
- **Foundational (Phase 2)**: BLOQUEA las Phases 3–5. T304 (tipos + algoritmo) debe completarse
  antes que T305, T306 y T318. T300–T303 (tests) preceden a sus respectivas implementaciones
  T304–T307.
- **User Stories (Phase 3–5)**: todas dependen de que Phase 2 esté completa. Dentro de cada
  historia, los tests (T3xx pares bajos) preceden a su implementación.
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Phase 2. Es la única imprescindible para un MVP demostrable.
- **US2 (P2)**: depende de Phase 2 y de T311 (el estado de `MainPage` que crea US1), porque
  apaga/recalcula ese mismo estado — no es una historia aislada en archivos distintos, comparte
  `MainPage.tsx` con US1.
- **US3 (P3)**: depende de Phase 2 y de T311 (mismo motivo que US2); es independiente de US2
  entre sí (T314/T315 vs. T318/T319 tocan lógica distinta dentro del mismo archivo).

### Parallel Opportunities

- Foundational: T300, T301, T302, T303 en paralelo (archivos de test distintos). Luego T305,
  T306 y T307 en paralelo entre sí (todas dependen de T304 o de su propio test, pero no entre
  ellas).
- US1: T308 y T309 en paralelo (archivos de test distintos).
- US2: T312 y T313 en paralelo.
- US3: T316 y T317 en paralelo.
- Polish: T320 y T322 en paralelo.

---

## Parallel Example: Foundational

```bash
# Tests (todas en archivos distintos, sin dependencias entre sí):
Task: "Test detectComplexes en src/frontend/src/metrics/complexDetection.test.ts"
Task: "Test wrapper de Worker en src/frontend/src/workers/complexDetection.worker.test.ts"
Task: "Test drawComplexMarks en src/frontend/src/render/drawComplexMarks.test.ts"
Task: "Test de interacción de Sidebar en src/frontend/src/components/layout/Sidebar.test.tsx"

# Implementación (una vez que T304 está lista, T305/T306/T307 en paralelo):
Task: "Implementar complexDetection.worker.ts"
Task: "Implementar drawComplexMarks.ts"
Task: "Renombrar sección y agregar botón en Sidebar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 2: Foundational (motor + dibujo + botón).
2. Completar Phase 3: User Story 1.
3. **Parar y validar**: correr quickstart.md Escenarios 1 y 4 a mano.
4. Esto ya es demostrable: activar la herramienta marca los 5 puntos sobre toda la señal.

### Entrega incremental

1. Foundational → motor listo (sin UI conectada todavía).
2. + US1 → MVP demostrable (marcar y ver, incluyendo señales largas).
3. + US2 → apagar sin alterar la señal + convivencia con filtros.
4. + US3 → aviso de baja confianza.
5. Polish → verificación cruzada + quickstart-results.md + backlog actualizado.

### Notas

- No hay estrategia de equipo paralelo distinta a la de Parallel Opportunities: US2 y US3 no son
  archivo-independientes de US1 (ambas extienden el mismo estado en `MainPage.tsx` creado por
  US1), así que en la práctica conviene implementarlas en orden P1 → P2 → P3 aunque sus tests
  puedan escribirse antes.
- Verificar que cada test falla por la razón esperada antes de implementar (Principio I).
- Hacer commit después de cada tarea o grupo lógico.
