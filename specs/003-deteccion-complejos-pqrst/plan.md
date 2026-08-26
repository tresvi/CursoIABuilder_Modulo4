# Implementation Plan: Detección y marcado de complejos PQRST

**Branch**: `main` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-deteccion-complejos-pqrst/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Renombrar la sección "Filtros" de la barra lateral a "Diagnósticos" y agregar como
primer botón "Detec. Complejos": al activarlo, se detectan y marcan los 5 puntos
(P, Q, R, S, T) de cada complejo sobre toda la señal cargada, reutilizando la
detección de picos R ya existente (`detectRPeaks`) como ancla. La detección corre
en un Web Worker (para no bloquear el render, Principio V), convive con los
filtros de señal (recalculando automáticamente al aplicarlos/cambiarlos/
restaurarlos, FR-007), nunca se persiste (FR-010) y avisa in-app cuando la señal
no permite una detección confiable (FR-008). Es una feature 100% frontend: no se
agregan endpoints ni cambios de backend.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19.2, Vite 6) — sin cambios de backend
(.NET 10 se mantiene igual, esta feature no lo toca).

**Primary Dependencies**: Ninguna dependencia nueva. Se reutiliza React, el motor
de render Canvas 2D propio (`src/frontend/src/render/`) y la API nativa `Worker`
del navegador (sin librería adicional).

**Storage**: N/A — FR-010 establece que las marcas nunca se persisten; son
siempre una vista derivada en memoria.

**Testing**: Vitest + React Testing Library (mismo stack que el resto del
frontend); `dotnet test` no debería verse afectado (no hay cambios de backend).

**Target Platform**: Igual que el resto de la app — tablet + PC (mobile fuera de
alcance, según AGENTS.md); mismos navegadores ya soportados.

**Project Type**: Web application existente (frontend `src/frontend` + backend
`src/backend`); esta feature es exclusivamente frontend.

**Performance Goals**: SC-001 — sobre el archivo de referencia de 1 minuto (mismo
usado por RNF-01/03 de la feature 001), ver las marcas en <1 s. Para señales más
largas, FR-012 permite un estado de "procesando" en vez de garantizar ese tiempo,
siempre y cuando la interfaz no se bloquee (research.md D2: Web Worker).

**Constraints**: No romper el Principio V (render <0.1 s / ≥10 fps ya vigente para
el trazado); no alterar el cálculo de BPM/SDNN/RMSSD/pNN50 (Principio IV, siguen
siendo sobre la ventana visible, sin relación con esta feature); un solo canal
(restricción ya existente de la app); nunca modificar la señal original
(Principio II).

**Scale/Scope**: Igual que el resto de la app: sin límite formal de duración de
señal, pero sin objetivo de rendimiento dedicado a grabaciones tipo Holter
(horas) — ver Clarification 2026-08-26 en spec.md.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Test-First (NO-NEGOCIABLE) | **Aplica de lleno**: la detección (`complexDetection.ts`), el dibujo (`drawComplexMarks.ts`) y el nuevo comportamiento de UI (toggle, recalculo tras filtrar, aviso de baja confianza) son cambios de comportamiento → TDD obligatorio (rojo→verde→refactor) para cada uno, más tests de interacción para el renombrado/orden de la sidebar (cláusula de Alcance v1.2.0). **PASS** (a verificar en `tasks.md`/implementación). |
| II. Integridad de la Señal Original | Las marcas son puramente derivadas y de solo lectura sobre la señal (original o filtrada); ninguna operación de esta feature escribe sobre `originalSamples`. **PASS**. |
| III. Persistencia Explícita | FR-010 va más allá de lo mínimo exigido: las marcas NUNCA se persisten, ni siquiera con "Guardar". Es una restricción más estricta que la del principio, no un conflicto. **PASS**. |
| IV. Métricas sobre la Ventana Visible | Este principio acota expresamente BPM/SDNN/RMSSD/pNN50, que esta feature no toca ni recalcula de otra forma. La detección de complejos es una capa de marcado visual distinta, con su propio criterio de rendimiento (SC-001/FR-012), calculada sobre toda la señal cargada por pedido explícito del spec (FR-003). No es una métrica de las cuatro listadas, así que no hay conflicto textual con el principio — se deja constancia acá para que un `/speckit-analyze` futuro no lo marque como violación sin contexto. **PASS (con nota)**. |
| V. Rendimiento de Visualización | El dibujo de las marcas es una lista precomputada que se pinta en el lienzo overlay igual que los marcadores manuales (costo marginal, ya validado por la feature 001); el cómputo pesado (detección) se saca del hilo principal con un Web Worker (research.md D2) precisamente para no arriesgar el <0.1 s / ≥10 fps existente. **PASS**. |

No hay violaciones que requieran la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-deteccion-complejos-pqrst/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera carpeta `contracts/`: esta feature no agrega ni cambia ninguna
interfaz externa (no hay endpoint nuevo de backend; el `Worker` es un detalle de
implementación interno del frontend, no un contrato público).

### Source Code (repository root)

Aplica la estructura **Web application** ya establecida por el proyecto
(`src/frontend` + `src/backend`, ver AGENTS.md). Esta feature solo agrega/modifica
archivos dentro de `src/frontend`; `src/backend` no se toca.

```text
src/frontend/src/
├── metrics/
│   ├── rPeakDetection.ts          # existente, reutilizado como ancla (sin cambios)
│   ├── complexDetection.ts        # NUEVO: ubica Q/S/P/T a partir de los R (D3)
│   └── complexDetection.test.ts   # NUEVO
├── workers/
│   ├── complexDetection.worker.ts # NUEVO: corre complexDetection.ts fuera del hilo principal (D2)
│   └── complexDetection.worker.test.ts  # NUEVO
├── render/
│   ├── drawMarkers.ts             # existente, sin cambios (marcadores manuales)
│   ├── drawComplexMarks.ts        # NUEVO: dibuja P/Q/R/S/T en el overlay (D4)
│   └── drawComplexMarks.test.ts   # NUEVO
├── components/
│   ├── ECGChart.tsx               # MODIFICADO: nueva prop `complexMarks`, se pinta en paintOverlay
│   ├── ECGChart.test.tsx          # MODIFICADO: casos nuevos para complexMarks
│   └── layout/
│       ├── Sidebar.tsx            # MODIFICADO: "Filtros"→"Diagnósticos", botón "Detec. Complejos" primero
│       └── Sidebar.test.tsx       # MODIFICADO: casos nuevos de renombrado/orden/estado
└── pages/
    ├── MainPage.tsx               # MODIFICADO: estado idle/processing/ready (data-model.md), efecto de recalculo tras filtrar
    └── MainPage.test.tsx          # MODIFICADO: casos nuevos de activar/desactivar/recalcular/aviso
```

**Structure Decision**: Se mantiene la estructura Web application existente sin
agregar nuevas carpetas de primer nivel; `workers/` es la única carpeta nueva
dentro de `src/frontend/src`, siguiendo la misma convención plana que ya usan
`metrics/`, `render/` y `hooks/` (un archivo de implementación + su `.test.ts`
hermano).

## Complexity Tracking

No aplica — el Constitution Check no encontró violaciones que justificar.
