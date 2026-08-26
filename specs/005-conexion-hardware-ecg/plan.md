# Implementation Plan: Conexión al hardware del ECG por puerto serie

**Branch**: `005-conexion-hardware-ecg` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-conexion-hardware-ecg/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Nueva sección "Conectarse" en la sidebar (botones "Configuración" y
"Conectarse"/"Desconectarse"). El backend abre el puerto serie elegido
(`System.IO.Ports`, dependencia nueva), lee enteros línea por línea, los
escala a mV (`cuenta × 10/4095`) y los numera a 250 Hz (`t = n/250`),
empujándolos al frontend por Server-Sent Events en lotes de ~100 ms. Conectar
reemplaza cualquier señal cargada (como abrir un archivo nuevo); mientras dura
la conexión, la ventana visible sigue el extremo más reciente (monitor en
vivo); la sesión se corta sola a los 20 minutos (300 000 muestras). Al
detener, lo capturado queda disponible para el resto de la app (filtros,
espectro, complejos, guardar) igual que una señal de archivo.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19.2, Vite 6) + .NET 10 (Minimal
API) — toca ambos lados, como la feature 004.

**Primary Dependencies**: `System.IO.Ports` (NuGet, **nueva** dependencia de
backend) para el acceso al puerto serie. Sin dependencias nuevas en el
frontend (`EventSource` es nativo del navegador).

**Storage**: N/A para la configuración de conexión (research.md/data-model.md:
`ConnectionConfig` no se persiste). La señal ya capturada, una vez detenida la
conexión, se guarda igual que cualquier otra (`StudyRepository` existente, sin
cambios).

**Testing**: xUnit (backend: `SerialCaptureService` con una fuente de líneas
inyectable/simulada, nunca un puerto real) + Vitest/RTL (frontend: hook +
diálogo + sidebar, con `EventSource` simulado).

**Target Platform**: Igual que el resto de la app, con la salvedad de que esta
feature exige que el navegador y el hardware estén en la misma máquina que el
backend (research.md/spec.md Assumptions) — no aplica a un despliegue remoto
(p. ej. el sitio de GitHub Pages que ya expone el repo).

**Project Type**: Web application existente; toca `src/backend` y `src/frontend`.

**Performance Goals**: FR-012/Constitución v1.4.0 — actualización visual con
demora ≤100 ms durante la captura en vivo.

**Constraints**: Principio II (la señal capturada, una vez formada, es
inmutable como cualquier otra); Principio III (nada se persiste solo — ni la
config de conexión ni la señal en curso — hasta que el usuario presione
Guardar); límite duro de 20 min / 300 000 muestras (FR-013); una sola conexión
activa a la vez (research.md D9).

**Scale/Scope**: Sesiones de hasta 300 000 muestras (un solo canal), mismo
orden de magnitud que archivos ya soportados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Test-First (NO-NEGOCIABLE) | **Aplica de lleno**: nuevo servicio de backend, nuevos endpoints, nuevo hook/diálogo/sección de sidebar son todos cambio de comportamiento → TDD obligatorio en ambos lados, con el puerto serie siempre simulado en tests (nunca hardware real). **PASS**. |
| II. Integridad de la Señal Original | Una vez que una muestra entra a la señal en curso, no se modifica salvo por los mecanismos ya existentes (filtro/recorte, no destructivos). **PASS**. |
| III. Persistencia Explícita | La config de conexión y la señal en curso NUNCA se persisten solas; "Guardar" sigue siendo el único gatillo, igual que hoy. **PASS**. |
| IV. Métricas sobre la Ventana Visible | Sin cambios: las métricas siguen calculándose sobre la ventana visible, que durante la conexión es la que sigue el extremo más reciente (research.md D8) — sigue siendo "la ventana visible", no toda la señal. **PASS**. |
| V. Rendimiento de Visualización | Cubierto por la enmienda v1.4.0: actualización ≤100 ms durante captura en vivo (distinto del render estático de <0.1 s/1 min, que sigue vigente para el trazado ya cargado). El redibujo del trazado sigue acotado a la ventana visible sin importar cuánto creció la señal total (mismo mecanismo de `drawSignal` ya existente). **PASS**. |

No hay violaciones que requieran la tabla de Complexity Tracking (la
excepción de alcance ya se resolvió con la enmienda de la constitución, no
acá).

## Project Structure

### Documentation (this feature)

```text
specs/005-conexion-hardware-ecg/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── contracts/
│   └── api.md           # Phase 1: /api/serial/ports|connect|disconnect|stream
├── quickstart.md        # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Estructura **Web application** existente; esta feature toca ambos lados.

```text
src/backend/ECGViewer.Api/
├── Models/ApiModels.cs              # MODIFICADO: DTOs de puertos/conexión/lote
├── Serial/
│   ├── ISerialLineSource.cs         # NUEVO: abstracción inyectable sobre el puerto (testeable sin hardware)
│   ├── SystemSerialLineSource.cs    # NUEVO: implementación real vía System.IO.Ports
│   ├── SampleScaling.cs             # NUEVO: cuenta → mV (Span/Zero), pura y testeable
│   └── SerialCaptureService.cs      # NUEVO: singleton, estado de la única conexión, contador de muestras, límite de 20 min
├── Endpoints/
│   └── SerialEndpoints.cs           # NUEVO: GET ports, POST connect/disconnect, GET stream (SSE)
└── Program.cs                       # MODIFICADO: registrar el servicio + endpoints

src/backend/ECGViewer.Tests/
├── SampleScalingTests.cs            # NUEVO
├── SerialCaptureServiceTests.cs     # NUEVO (fuente de líneas simulada)
└── SerialEndpointTests.cs           # NUEVO

src/frontend/src/
├── api/
│   └── serialApi.ts                 # NUEVO: listPorts/connect/disconnect + apertura del EventSource
├── hooks/
│   └── useSerialConnection.ts       # NUEVO: estado de configuración/conexión, acumula muestras entrantes
│   └── useSerialConnection.test.ts  # NUEVO
├── components/
│   ├── SerialConfigDialog.tsx       # NUEVO: elegir puerto + baudios (default 115200)
│   ├── SerialConfigDialog.test.tsx  # NUEVO
│   └── layout/
│       ├── Sidebar.tsx              # MODIFICADO: sección "Conectarse" (Configuración/Conectarse)
│       └── Sidebar.test.tsx         # MODIFICADO
├── hooks/
│   └── useVisibleWindow.ts          # MODIFICADO: modo autoseguimiento durante la conexión (research.md D8)
└── pages/
    ├── MainPage.tsx                  # MODIFICADO: reemplaza la señal al conectar, wiring del hook
    └── MainPage.test.tsx             # MODIFICADO
```

**Structure Decision**: Se agrega una carpeta nueva `Serial/` en el backend
(mismo nivel que `Dsp/`/`Persistence/`), siguiendo la convención ya
establecida de agrupar por dominio técnico. En el frontend, mismo patrón que
`spectrumApi.ts`/`useComplexDetection.ts`/`SpectrumChart.tsx` de features
anteriores: un cliente de API, un hook de estado, un componente de UI nuevo.

## Complexity Tracking

No aplica — el Constitution Check no encontró violaciones que justificar.
