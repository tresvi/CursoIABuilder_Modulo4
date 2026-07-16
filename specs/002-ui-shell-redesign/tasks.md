---
description: "Task list for UI shell redesign (feature 002)"
---

# Tasks: Rediseño del cascarón de UI (dashboard con sidebar)

**Input**: Design documents from `/specs/002-ui-shell-redesign/`

**Prerequisites**: plan.md, spec.md, research.md

**Tests**: Esta feature es de **presentación/UX**. El Principio I (Test-First) se satisface
preservando el contrato de tests de la feature 001 (los `data-testid`/`aria-label`: la suite de 86
tests queda verde sin editarse) y agregando **tests de interacción** para el comportamiento nuevo con
lógica de UI real (colapso de sidebar y de secciones). La fidelidad visual (colores, spacing,
alturas, ausencia de overflow) se verifica por preview — límite legítimo de TDD para presentación
(ver `research.md`).

**Organization**: Agrupadas por fase; numeración `T2xx` para no colisionar con la feature 001.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos)
- **[Story]**: US1–US5 (mapea a spec.md)
- **[X]**: completada

---

## Phase 1: Setup (Tailwind + shadcn)

- [X] T200 Instalar dependencias en `src/frontend/package.json`: `tailwindcss` v4 + `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
- [X] T201 Alias `@/*` → `src/*` en `src/frontend/tsconfig.json` y `resolve.alias` + plugin `tailwindcss()` en `src/frontend/vite.config.ts`
- [X] T202 Crear `src/frontend/src/index.css` (`@import "tailwindcss"` + tokens de tema navy/teal) e importarlo en `src/frontend/src/main.tsx`
- [X] T203 [P] Helper `cn` en `src/frontend/src/lib/utils.ts`
- [X] T204 [P] Primitivos shadcn en `src/frontend/src/components/ui/`: `button`, `card`, `badge`, `input` y `select` (estos dos últimos nativos estilados — decisión D12)

## Phase 2: Cascarón (US1)

- [X] T205 [US1] `NavItem` (ícono + etiqueta + tooltip en colapsado) en `src/frontend/src/components/layout/NavItem.tsx`
- [X] T206 [US1] `Sidebar` con grupos Archivo/Herramientas/Filtros (en ese orden) cableados a los handlers existentes en `src/frontend/src/components/layout/Sidebar.tsx`
- [X] T207 [US1] `TopBar` (breadcrumb + estado + velocidad de papel) y `StatusBar` (Fs/duración/muestras) en `src/frontend/src/components/layout/`
- [X] T208 [US1] `AppLayout` (sidebar · contenido · footer) en `src/frontend/src/components/layout/AppLayout.tsx`
- [X] T209 [US1] Reescribir el árbol JSX de `src/frontend/src/pages/MainPage.tsx` para montar el cascarón, conservando hooks/handlers/efectos y todos los `data-testid`/`aria-label`

## Phase 3: Interacción de la sidebar (US2, US3) — con tests

- [X] T210 [US2] Menú **hamburguesa** arriba de la sidebar que colapsa/expande (`aria-label`/`aria-expanded`); modo colapsado = solo íconos con tooltip
- [X] T211 [US3] Secciones colapsables (Archivo/Herramientas/Filtros) con encabezado clickeable + chevron
- [X] T212 [US2/US3/US5] **Tests de interacción** (Vitest/RTL) en `src/frontend/src/components/layout/Sidebar.test.tsx`: (a) el hamburguesa invoca `onToggleCollapse` y en colapsado el toggle expone "Expandir menú" ocultando etiquetas; (b) colapsar la sección "Filtros" oculta sus ítems (`aria-expanded=false`); (c) [SC-005] los controles de colapso son `<button>` nativos (operables por teclado por semántica)

## Phase 4: Responsividad y paneles (US4, US5)

- [X] T213 [US4] Ancho responsivo del gráfico con `ResizeObserver` (fallback 900px para jsdom) en `src/frontend/src/components/ECGChart.tsx`; Card del gráfico `flex-1 min-w-0` en `MainPage`
- [X] T214 [US1] `FilterPanel` controlado por `type`/`onTypeChange` (preselección desde la sidebar) en `src/frontend/src/components/FilterPanel.tsx`
- [X] T215 [US5] `MetricsPanel` encuadrado en cuadro blanco, compacto (~128px) y alineado al alto del gráfico (`items-stretch` en `MainPage`) en `src/frontend/src/components/MetricsPanel.tsx`
- [X] T216 [P] Restyle de `MarkerEditor`, `ConfirmDialog`, `MarkerPromptDialog` y `FileLoader` con los primitivos UI, conservando roles/testids

## Phase 5: Verificación

- [X] T217 `npm run typecheck` limpio y `npm run build` (Tailwind compila) OK
- [X] T218 `npm test` — 86 tests heredados de 001 verdes (contrato preservado); 90 en total con los tests de interacción nuevos (T212)
- [X] T219 Verificación visual por preview: estado vacío, dashboard cargado, colapso sidebar/secciones, tablet (768px) y PC (1280px) sin overflow, alturas gráfico=métricas
- [X] T219b [FR-010] Verificar que el diff NO toca lógica de dominio ni el motor de dibujo: sin cambios en `src/frontend/src/render/*`, `src/frontend/src/signal/*`, `src/frontend/src/metrics/*` ni `src/backend/` (confirmado por `git diff --stat` de los commits `3d715ab`/`1451e6d`)
- [X] T220 Actualizar `AGENTS.md` con el stack de UI y la convención de carpetas del cascarón

## Dependencies

- Phase 1 (T200–T204) precede a todo.
- Phase 2 (cascarón) precede a Phase 3–4.
- T212 (tests) depende de T210–T211.
- Phase 5 cierra.

## Estado

Implementación entregada y verificada (commit `3d715ab`). Documentación spec-kit + tests de
interacción (T212) + nota en AGENTS.md (T220) completados. Todas las tareas cerradas.
