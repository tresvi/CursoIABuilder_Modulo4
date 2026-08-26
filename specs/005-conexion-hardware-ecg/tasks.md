---
description: "Task list for conexión al hardware del ECG por puerto serie (feature 005)"
---

# Tasks: Conexión al hardware del ECG por puerto serie

**Input**: Design documents from `/specs/005-conexion-hardware-ecg/`

**Prerequisites**: plan.md (requerido), spec.md (requerido), research.md, data-model.md,
contracts/api.md, quickstart.md. Requiere la constitución v1.4.0 (ya enmendada).

**Tests**: El Principio I (Test-First, NO-NEGOCIABLE) aplica de lleno. El puerto serie
SIEMPRE se simula en los tests vía `ISerialLineSource` — nunca hardware real (mismo
criterio que "los tests nunca llaman a la API real de Claude").

**Organization**: Agrupadas por fase; numeración `T5xx` para no colisionar con las
features 001–004.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencia entre sí)
- **[Story]**: US1, US2, US3 (mapea a spec.md)

---

## Phase 1: Setup

- [X] T500 Backend: agregar el paquete NuGet `System.IO.Ports` a
  `src/backend/ECGViewer.Api/ECGViewer.Api.csproj` (research.md D1).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DTOs, la fórmula de escalado y la abstracción sobre el puerto serie que
comparten US1 y US2. Ninguna historia puede empezar sin esto.

### Tests (escribir primero, deben fallar)

- [X] T501 [P] Test en `src/backend/ECGViewer.Tests/SampleScalingTests.cs`: cuenta `0`
  → 0 mV; cuenta `2048` → ≈5 mV; cuenta `4095` → ≈10 mV; fórmula exacta
  `cuenta × (10/4095) + 0` (FR-006).

### Implementación

- [X] T502 [P] `src/backend/ECGViewer.Api/Models/ApiModels.cs`: agregar
  `SerialPortsResponse(IReadOnlyList<string> Ports)`,
  `SerialConnectRequest(string Port, int BaudRate)`,
  `SerialStreamSampleDto(double T, double V)`,
  `SerialStreamEventDto(IReadOnlyList<SerialStreamSampleDto> Samples, string Status, string? Reason)`,
  y en `ErrorCodes`: `PortNotFound`, `AlreadyConnected`, `PortUnavailable`.
- [X] T503 [P] `src/backend/ECGViewer.Api/Serial/SampleScaling.cs`: función pura
  `ToMillivolts(int count)` (FR-006). Hace pasar T501.
- [X] T504 [P] `src/backend/ECGViewer.Api/Serial/ISerialLineSource.cs`: interfaz
  inyectable (listar puertos, abrir/cerrar, emitir líneas entrantes y el evento de
  desconexión inesperada) que abstrae `System.IO.Ports.SerialPort` — permite simular
  el hardware en todos los tests de esta feature (quickstart.md).

**Checkpoint**: DTOs, escalado y abstracción del puerto listos; nada de esto está
conectado a un endpoint todavía.

---

## Phase 3: User Story 1 - Configurar el puerto y la velocidad (Priority: P1)

**Goal**: Desde "Conectarse" → "Configuración", elegir puerto y baudios (115200 por
defecto).

**Independent Test**: Abrir "Configuración" y verificar la lista de puertos y el
default de baudios (quickstart.md, Escenario 1).

### Tests (escribir primero, deben fallar)

- [ ] T505 [P] [US1] Test en `src/backend/ECGViewer.Tests/SerialEndpointTests.cs`:
  `GET /api/serial/ports` devuelve la lista que reporta `ISerialLineSource` (fake
  inyectado); `[]` si no hay ninguno (FR-002, contracts/api.md).
- [ ] T506 [P] [US1] Test en
  `src/frontend/src/components/SerialConfigDialog.test.tsx`: lista los puertos
  recibidos; el campo de baudios muestra **115200** preseleccionado (FR-003); al
  confirmar, expone la elección al padre.
- [ ] T507 [P] [US1] Test en `src/frontend/src/components/layout/Sidebar.test.tsx`:
  aparece una sección "Conectarse" (al mismo nivel que "Herramientas"/"Diagnósticos")
  con un botón "Configuración" (FR-001/002).

### Implementación

- [ ] T508 [US1] `src/backend/ECGViewer.Api/Endpoints/SerialEndpoints.cs` (solo
  `GET /api/serial/ports` por ahora) + registrar `app.MapSerialEndpoints()` en
  `Program.cs`. Depende de T502, T504. Hace pasar T505.
- [ ] T509 [P] [US1] `src/frontend/src/api/serialApi.ts`: `listPorts()`.
- [ ] T510 [US1] `src/frontend/src/components/SerialConfigDialog.tsx`: selector de
  puerto + baudios (default 115200). Depende de T509. Hace pasar T506.
- [ ] T511 [US1] `src/frontend/src/components/layout/Sidebar.tsx`: sección
  "Conectarse" con "Configuración" (abre el diálogo) y un botón "Conectarse"
  deshabilitado hasta tener una configuración válida (se habilita de verdad en US2).
  Hace pasar T507.

**Checkpoint**: US1 funciona de punta a punta de forma independiente (quickstart
Escenario 1).

---

## Phase 4: User Story 2 - Conectarse y recibir la señal del dispositivo (Priority: P1) 🎯 MVP

**Goal**: "Conectarse" abre el puerto, escala cada entero a mV, lo numera a 250 Hz y
lo muestra en vivo (≤100 ms), reemplazando cualquier señal cargada; se detiene sola a
los 20 minutos.

**Independent Test**: Con un puerto configurado y una fuente simulada enviando
enteros, conectarse y ver el trazado en mV actualizarse en vivo (quickstart.md,
Escenarios 2 y 4).

### Tests (escribir primero, deben fallar)

- [ ] T512 [P] [US2] Test en
  `src/backend/ECGViewer.Tests/SerialCaptureServiceTests.cs` (fuente simulada vía
  `ISerialLineSource` fake, nunca hardware real): la línea `"2048"` produce una
  muestra ≈5 mV en `t=0`, la siguiente en `t=1/250` (FR-006/007); una línea no
  numérica se descarta sin cortar la conexión (FR-008); al acumular 300 000 muestras
  válidas la conexión se detiene sola con `status="stopped"`/`reason="TIME_LIMIT"`
  (FR-013); si la fuente simulada reporta desconexión, `status="error"` (FR-009).
- [ ] T513 [P] [US2] Test en `SerialEndpointTests.cs`: `POST /api/serial/connect`
  con un puerto válido devuelve 200; una segunda llamada mientras hay una conexión
  activa devuelve 409 `ALREADY_CONNECTED` (research.md D9); un puerto que no está en
  la lista devuelve 400 `PORT_NOT_FOUND`; `POST /api/serial/disconnect` es
  idempotente.
- [ ] T514 [P] [US2] Test en
  `src/frontend/src/hooks/useSerialConnection.test.ts` (con una fuente de eventos
  SSE simulada/inyectable, análogo al Worker inyectable de la feature 003):
  `connect()` llama a `POST /connect` y luego consume el stream; cada evento recibido
  se acumula en el arreglo de muestras; un evento con `status:"stopped"` cierra el
  consumo y expone el motivo (`reason`).
- [ ] T515 [P] [US2] Test en `src/frontend/src/pages/MainPage.test.tsx`: presionar
  "Conectarse" (con el hook mockeado) reemplaza cualquier señal cargada (FR-011); las
  muestras que llega el hook se reflejan en el trazado; mientras está "conectado", la
  ventana visible sigue el extremo más reciente de la señal (research.md D8).

### Implementación

- [ ] T516 [US2] `src/backend/ECGViewer.Api/Serial/SystemSerialLineSource.cs`:
  implementación real de `ISerialLineSource` vía `System.IO.Ports.SerialPort`.
  Depende de T500, T504.
- [ ] T517 [US2] `src/backend/ECGViewer.Api/Serial/SerialCaptureService.cs`:
  singleton con el estado de la única conexión posible (idle/connected/stopped/error,
  data-model.md), numera muestras `t=n/250` (D5), aplica `SampleScaling` (D4), corta
  sola a las 300 000 muestras válidas (D6), agrupa en lotes cada ~100 ms para quien
  esté suscripto (D2). Depende de T503, T504. Hace pasar T512.
- [ ] T518 [US2] `src/backend/ECGViewer.Api/Endpoints/SerialEndpoints.cs`: agregar
  `POST /connect`, `POST /disconnect`, `GET /stream` (Server-Sent Events, D2/D3).
  Depende de T517. Hace pasar T513.
- [ ] T519 [P] [US2] `src/frontend/src/hooks/useSerialConnection.ts`:
  `connect()`/`disconnect()`, consume `EventSource` sobre `/api/serial/stream`,
  acumula las muestras entrantes. Hace pasar T514.
- [ ] T520 [US2] `src/frontend/src/hooks/useVisibleWindow.ts`: modo autoseguimiento
  — mientras hay una conexión activa, la ventana se recalcula a
  `[último−ancho, último]` en cada lote nuevo (research.md D8), sin bloquear el
  pan/zoom manual una vez desconectado.
- [ ] T521 [US2] `src/frontend/src/pages/MainPage.tsx`: habilita de verdad
  "Conectarse" (T511); al presionar, reemplaza la señal actual (FR-011, mismo
  `initDerivation` que cargar un archivo) y conecta el hook + el autoseguimiento de
  ventana. Depende de T519, T520. Hace pasar T515.

**Checkpoint**: US1 + US2 funcionan de punta a punta (quickstart Escenarios 1, 2 y 4).

---

## Phase 5: User Story 3 - Detener la conexión y quedarse con lo capturado (Priority: P2)

**Goal**: "Desconectarse" cierra el puerto; lo capturado queda disponible para el
resto de la app igual que una señal de archivo.

**Independent Test**: Detener una conexión con datos ya recibidos y verificar que
filtrar/ver el espectro/detectar complejos/guardar funcionan igual que siempre
(quickstart.md, Escenario 3).

### Tests (escribir primero, deben fallar)

- [ ] T522 [P] [US3] Test en `MainPage.test.tsx`: "Desconectarse" llama a
  `disconnect()` del hook y apaga el autoseguimiento de la ventana (el usuario
  recupera pan/zoom manual); la señal capturada sigue disponible después. **No** se
  duplican los tests ya existentes de filtros/espectro/complejos/guardar — sirven tal
  cual de regresión porque, una vez detenida la conexión, el resultado es una
  `Signal` común (data-model.md).

### Implementación

- [ ] T523 [US3] `src/frontend/src/components/layout/Sidebar.tsx` +
  `src/frontend/src/pages/MainPage.tsx`: botón "Desconectarse" en el lugar de
  "Conectarse" mientras hay una conexión activa; llama a `disconnect()` y desactiva
  el autoseguimiento (T520). Depende de T521. Hace pasar T522.

**Checkpoint**: Las 3 historias funcionan juntas (quickstart Escenario 3).

---

## Phase 6: Polish & Verificación

- [ ] T524 [P] `dotnet build` / `dotnet test` en `src/backend` — 0 warnings nuevos.
- [ ] T525 [P] `npm run typecheck` y `npm run lint` en `src/frontend` — 0 warnings.
- [ ] T526 `npm test` (frontend) y `dotnet test` (backend) — toda la suite (existente
  + la nueva de esta feature) en verde.
- [ ] T527 [P] Ejecutar manualmente los 4 escenarios de `quickstart.md` con un
  dispositivo real o un puerto serie simulado, y documentar el resultado en
  `specs/005-conexion-hardware-ecg/quickstart-results.md` (requiere hardware/entorno
  real — misma categoría que T077/T078 de la feature 001).
- [ ] T528 Actualizar `AGENTS.md`: nueva dependencia NuGet `System.IO.Ports`, puntero
  operativo a `Serial/SerialCaptureService.cs` y al patrón SSE usado para el stream
  en vivo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: bloquea T516 (necesita el paquete NuGet).
- **Foundational (Phase 2)**: bloquea US1 y US2. T501 (test) precede a T503.
- **US1 (Phase 3)**: depende solo de Foundational.
- **US2 (Phase 4)**: depende de Foundational; **no** depende de US1 en el backend,
  pero en el frontend reutiliza el botón "Conectarse" que US1 dejó deshabilitado
  (T511) — por eso conviene implementarla después.
- **US3 (Phase 5)**: depende de T521 (US2), porque agrega el botón "Desconectarse"
  al mismo lugar donde vive "Conectarse".
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén
  completas.

### Parallel Opportunities

- Foundational: solo T501 es test; T502/T503/T504 en paralelo entre sí una vez que
  T501 está en rojo (T503 debe hacerlo pasar, así que en la práctica T503 va después
  de T501; T502 y T504 son independientes y pueden ir en paralelo con cualquiera).
- US1: T505/T506/T507 en paralelo (tests); T509 en paralelo con el backend T508.
- US2: T512/T513/T514/T515 en paralelo (tests, archivos distintos); T519 en paralelo
  con el bloque de backend T516–T518.
- Polish: T524, T525 y T527 en paralelo.

---

## Parallel Example: User Story 2

```bash
# Tests (todos en archivos distintos):
Task: "Test SerialCaptureService en src/backend/ECGViewer.Tests/SerialCaptureServiceTests.cs"
Task: "Test connect/disconnect en SerialEndpointTests.cs"
Task: "Test useSerialConnection en src/frontend/src/hooks/useSerialConnection.test.ts"
Task: "Test MainPage (reemplazo de señal + autoseguimiento) en MainPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar Phase 3 (US1): configurar puerto/baudios.
3. Completar Phase 4 (US2): conectar y ver la señal en vivo — **acá ya está el
   valor central de la feature**.
4. **Parar y validar**: correr quickstart.md Escenarios 1, 2 y 4 con una fuente
   simulada.

### Entrega incremental

1. Foundational → base compartida lista.
2. + US1 → configurar puerto/baudios.
3. + US2 → conectar y ver en vivo (MVP demostrable).
4. + US3 → detener y reutilizar lo capturado con el resto de la app.
5. Polish → verificación cruzada + quickstart-results.md (requiere hardware/entorno
   real) + AGENTS.md.

### Notas

- El puerto serie NUNCA se abre de verdad en un test automatizado — siempre
  `ISerialLineSource` simulado (Principio I + quickstart.md).
- T511 y T523 tocan el mismo bloque de `Sidebar.tsx`/`MainPage.tsx` — implementarlas
  en ese orden evita reescribir el mismo botón dos veces.
- Verificar que cada test falla por la razón esperada antes de implementar.
- Hacer commit después de cada tarea o grupo lógico.
