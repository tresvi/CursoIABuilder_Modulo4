# Implementation Plan: ECGViewer — Visor y analizador web de ECG desde CSV/XLSX

**Branch**: `001-ecg-viewer` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ecg-viewer/spec.md`

## Summary

ECGViewer es una aplicación web de libre acceso para cargar, visualizar, filtrar y analizar
señales de ECG monocanal desde archivos CSV/XLSX. El enfoque técnico usa un **frontend React
19.2 + TypeScript (Vite)** que hace el trabajo interactivo y de baja latencia —parseo de CSV,
render sobre **Canvas de doble capa** (lienzo base para señal/ejes + lienzo superpuesto para el
mouse), cálculo de **métricas HRV sobre la ventana visible**, marcadores, regla, zoom y recorte—
y un **backend .NET 10 (Minimal API)** que concentra el trabajo pesado y correcto por contrato:
**filtros DSP con FftSharp**, **import/export XLSX con ClosedXML/OpenXml** y la **persistencia de
un único estudio en SQLite**. La señal original es inmutable; filtros y recortes son reversibles.
Nada se persiste sin acción explícita "Guardar".

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), C# / .NET 10 (backend)

**Primary Dependencies**:
- Frontend: React 19.2, Vite, Vitest (+ Testing Library), Canvas 2D API nativa (sin librería
  gráfica pesada), Playwright (E2E, opcional).
- Backend: ASP.NET Core Minimal API (.NET 10), FftSharp (filtros DSP — RF-10), ClosedXML +
  DocumentFormat.OpenXml (XLSX — RF-12/RF-13), Microsoft.Data.Sqlite / EF Core-lite para SQLite,
  xUnit (tests).

**Storage**: SQLite — un único "estudio guardado" (señal + marcadores + filtros + recortes).
Sin usuarios ni sesiones.

**Testing**: Vitest (frontend, TDD de parseo, métricas HRV, geometría de interacción); xUnit
(backend, TDD de filtros DSP, import/export XLSX, persistencia). La API de Claude NUNCA se llama
en tests (mocks/fakes) — no hay uso de Claude en el alcance funcional actual.

**Target Platform**: Navegadores de escritorio (Chrome, Firefox, Edge, últimas 2 estables) y
móviles (Chrome Android, Safari iOS). Backend local en `http://localhost:5080`; front dev en
`http://localhost:5173`.

> **Nota (feature 002)**: el rediseño del cascarón de UI (`specs/002-ui-shell-redesign/`) acota
> el alcance de **presentación** a **tablet + PC** (viewports ≥ 768px); mobile queda diferido como
> trabajo futuro. Esta narrowing aplica al layout/cascarón, no a la lógica de dominio de 001.

**Project Type**: Web application (frontend + backend) — `src/frontend` y `src/backend`.

**Performance Goals**:
- Render de señal completa < 0.1 s p95 (20 mediciones) para archivo de 1 minuto (SC-001, RNF-01).
- Cálculo de métricas < 0.1 s p95 para 1 minuto (SC-002, RNF-03).
- Interacción fluida ≥ 10 fps (frame < 100 ms) sin redibujo completo del lienzo (SC-003, RNF-02).

**Constraints**:
- Señal original inmutable; filtros/recortes reversibles (no destructivo).
- Métricas SIEMPRE sobre la ventana visible, nunca sobre todo el archivo.
- Un solo canal; multicanal se informa y no se procesa.
- Persistencia solo por "Guardar"; alerta ante cierre/recarga con cambios pendientes.

**Scale/Scope**: 8 historias de usuario (P1–P3), 21 requisitos funcionales, ~1 pantalla
principal con panel de herramientas + panel de métricas. Archivos de referencia ~1 min de señal
(orden de 10k–60k muestras según fs).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.0.0:

| Principio | Cómo lo cumple el plan | Estado |
|-----------|------------------------|--------|
| **I. Test-First (NO-NEGOCIABLE)** | Todos los cálculos correctos por contrato (parseo, HRV, filtros, XLSX, persistencia) se diseñan como funciones/servicios puros con tests primero (Vitest/xUnit). `tasks.md` ordenará test → impl (rojo→verde→refactor). | ✅ PASS |
| **II. Integridad de la Señal Original** | `data-model.md` separa `originalSignal` (inmutable) de `workingSignal`. Filtros y recortes producen nuevas series derivadas; "revertir filtro" reconstruye desde el origen conservado. | ✅ PASS |
| **III. Persistencia Explícita** | No hay autosave. Persistencia solo vía `PUT /api/study` disparado por "Guardar". `beforeunload` alerta si hay `dirty=true`. Recorte requiere confirmación previa. | ✅ PASS |
| **IV. Métricas sobre la Ventana Visible** | El cálculo HRV toma `[fromTime, toTime]` de la `VisibleWindow` como entrada obligatoria; se recalcula en cada cambio de ventana. No existe ruta que calcule sobre todo el archivo. | ✅ PASS |
| **V. Rendimiento de Visualización** | Canvas 2D de doble capa (base + overlay), sin librería gráfica pesada; se re-dibuja solo la capa de interacción durante el mouse. Benchmarks contra archivo de 1 min como criterio de aceptación. | ✅ PASS |

**Restricciones de alcance/seguridad**: monocanal ✅; libre acceso sin login ✅; sin secretos
hardcodeados (no hay uso de Claude en el alcance; si se añadiera, `ANTHROPIC_API_KEY` en `.env`)
✅; no es herramienta de diagnóstico ✅; sin features fuera de alcance ✅.

**Resultado del gate**: PASS — sin violaciones. `Complexity Tracking` queda vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-ecg-viewer/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/           # Fase 1 (/speckit-plan)
│   └── api.md           # Contratos HTTP del backend
├── checklists/
│   └── requirements.md  # (ya existente)
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── backend/                         # Solución .NET (ECGViewer.Api + ECGViewer.Tests)
│   ├── ECGViewer.Api/
│   │   ├── Program.cs               # Minimal API: CORS 5173/4173, endpoints, DI
│   │   ├── Endpoints/               # Mapeo de rutas (filter, xlsx import/export, study)
│   │   ├── Dsp/                     # Filtros pasa bajo/alto/banda/notch (FftSharp)
│   │   ├── Excel/                   # Import/export XLSX (ClosedXML/OpenXml)
│   │   ├── Persistence/             # Repositorio SQLite del estudio único
│   │   └── Models/                  # DTOs de request/response
│   └── ECGViewer.Tests/             # xUnit: DSP, Excel, Persistence, endpoints
│
└── frontend/                        # React 19.2 + TS (Vite)
    ├── src/
    │   ├── components/               # ECGChart (canvas base+overlay), Toolbar,
    │   │                             # MetricsPanel, MarkersLayer, ConfirmDialog
    │   ├── hooks/                    # useVisibleWindow, useTool, useUnsavedGuard
    │   ├── signal/                   # csvParse, signalModel (original/working)
    │   ├── metrics/                  # rPeakDetection, hrv (BPM/SDNN/RMSSD/pNN50)
    │   ├── render/                   # canvas drawing (grid ECG, señal, overlay)
    │   ├── api/                      # cliente HTTP (VITE_API_BASE)
    │   └── pages/                    # pantalla principal
    └── tests/                        # Vitest (unit) + Playwright (E2E opcional)
```

**Structure Decision**: Web application de dos proyectos, alineada con AGENTS.md: `src/frontend`
(React/TS) y `src/backend` (.NET, solución con `ECGViewer.Api` y `ECGViewer.Tests`). El frontend
posee lo interactivo/latencia-crítico (render, métricas, herramientas de mouse); el backend
concentra DSP (FftSharp), XLSX (ClosedXML/OpenXml) y persistencia (SQLite), donde la corrección
por contrato se cubre con xUnit. Puertos y CORS ya alineados (5080 API, 5173/4173 front).

## Complexity Tracking

> Sin violaciones de la constitución: sección no aplicable.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
