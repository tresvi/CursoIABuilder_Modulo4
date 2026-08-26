# Implementation Plan: Vista de espectro de potencia y limpieza de la sidebar

**Branch**: `004-vista-espectro-potencia` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-vista-espectro-potencia/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Quita de la sidebar los atajos de filtro (Pasa Bajo/Alto/Banda/Notch) y el botón
"Restaurar" — el filtrado sigue disponible sin cambios en el panel de filtro debajo del
gráfico — y agrega "Espectro" en la sección "Diagnósticos": al activarlo, el gráfico
principal muestra el espectro de potencia (FftSharp, nuevo endpoint `/api/spectrum`) de
la señal actualmente mostrada sobre la ventana de tiempo visible, en vez del trazado.
Se recalcula solo al aplicar/cambiar/restaurar un filtro. Mientras se ve el espectro, ni
las marcas de complejos ni las herramientas de interacción del gráfico tienen efecto —
se logra montando un componente de gráfico distinto (`SpectrumChart`) en vez de
`ECGChart`, no agregándole un "modo" a este último. Nunca se persiste.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19.2, Vite 6) para el frontend; .NET 10
(Minimal API) para el nuevo endpoint de backend — a diferencia de la feature 003, esta
sí toca ambos lados.

**Primary Dependencies**: `FftSharp` (ya dependencia del backend, reutilizada para el
espectro — sin agregar nada nuevo). Sin dependencias nuevas en el frontend.

**Storage**: N/A — FR-010 establece que el espectro nunca se persiste.

**Testing**: xUnit (backend: endpoint + cálculo DSP) y Vitest + React Testing Library
(frontend), mismo stack que el resto del proyecto.

**Target Platform**: igual que el resto de la app (tablet + PC).

**Project Type**: Web application existente (`src/frontend` + `src/backend`); esta
feature toca ambos.

**Performance Goals**: SC-001 — el espectro se calcula sobre la ventana visible (acotada
por diseño, igual que las métricas HRV), así que el payload y el cómputo son siempre
chicos; sin objetivo de rendimiento dedicado más allá de "sin demora perceptible", ya
cubierto por operar solo sobre la ventana visible en vez de la señal completa.

**Constraints**: No romper el Principio V (el trazado ECG sigue con su render de
siempre; el espectro es una vista aparte); no persistir nada (Principio III/FR-010); no
perder funcionalidad de filtrado al reordenar su UI (FR-001, SC-004).

**Scale/Scope**: igual que el resto de la app; sin cambios de escala.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Test-First (NO-NEGOCIABLE) | **Aplica de lleno**: nuevo endpoint de backend, nuevo componente de render/UI, y comportamiento nuevo de sidebar/`MainPage` son todos cambios de comportamiento → TDD obligatorio en ambos lados. **PASS** (a verificar en tasks.md/implementación). |
| II. Integridad de la Señal Original | El espectro es una vista de solo lectura sobre la señal ya mostrada (original o filtrada); no la modifica. Quitar botones de la sidebar tampoco toca la señal. **PASS**. |
| III. Persistencia Explícita | FR-010: el espectro nunca se persiste. **PASS**. |
| IV. Métricas sobre la Ventana Visible | El espectro se calcula sobre la ventana visible (research.md D2) — a diferencia de la feature 003, esta feature está totalmente alineada con la letra del principio, sin necesitar ninguna nota de excepción. **PASS**. |
| V. Rendimiento de Visualización | El trazado ECG (`ECGChart`) no se modifica; el espectro es un componente aparte, estático por diseño (FR-007: ninguna herramienta de interacción aplica), así que no compite con el presupuesto de render del trazado. **PASS**. |

No hay violaciones que requieran la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-vista-espectro-potencia/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md           # Phase 1 output: contrato de POST /api/spectrum
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Aplica la estructura **Web application** ya establecida (`src/frontend` + `src/backend`,
ver AGENTS.md). A diferencia de la feature 003, esta SÍ toca `src/backend`.

```text
src/backend/ECGViewer.Api/
├── Models/ApiModels.cs           # MODIFICADO: SpectrumPointDto, SpectrumDto,
│                                  # SpectrumRequest, SpectrumResponse, ErrorCodes.InsufficientSamples
├── Dsp/
│   ├── SignalFilter.cs           # existente, sin cambios
│   ├── SignalMath.cs             # existente, reutilizado (ResolveFs)
│   └── PowerSpectrum.cs          # NUEVO: cálculo del espectro vía FftSharp
├── Endpoints/
│   └── SpectrumEndpoints.cs      # NUEVO: POST /api/spectrum
└── Program.cs                    # MODIFICADO: app.MapSpectrumEndpoints()

src/backend/ECGViewer.Tests/
└── SpectrumEndpointTests.cs      # NUEVO

src/frontend/src/
├── api/
│   └── spectrumApi.ts            # NUEVO: computeSpectrum(signal) → POST /api/spectrum
│   └── spectrumApi.test.ts       # NUEVO
├── render/
│   ├── drawSpectrum.ts           # NUEVO: dibuja el espectro reutilizando ecgScale.ts (D4)
│   └── drawSpectrum.test.ts      # NUEVO
├── components/
│   ├── SpectrumChart.tsx         # NUEVO: canvas simple, sin herramientas ni overlay
│   ├── SpectrumChart.test.tsx    # NUEVO
│   └── layout/
│       ├── Sidebar.tsx           # MODIFICADO: quita FILTERS/"Restaurar" y sus props;
│       │                         # agrega "Espectro"
│       └── Sidebar.test.tsx      # MODIFICADO
└── pages/
    ├── MainPage.tsx               # MODIFICADO: estado spectrumOn/spectrum/busy/error,
    │                              # efecto de recalculo, swap ECGChart↔SpectrumChart
    └── MainPage.test.tsx          # MODIFICADO
```

**Structure Decision**: Se mantiene la estructura Web application existente. No se
agregan carpetas de primer nivel nuevas; `SpectrumChart`/`drawSpectrum`/`spectrumApi`
siguen exactamente la misma convención de nombres/ubicación que sus pares de
`ECGChart`/`drawSignal`/`filterApi`.

## Complexity Tracking

No aplica — el Constitution Check no encontró violaciones que justificar.
