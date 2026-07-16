# Implementation Plan: Rediseño del cascarón de UI (dashboard con sidebar)

**Branch**: `002-ui-shell-redesign` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ui-shell-redesign/spec.md`

## Summary

Reemplazar el cascarón de estilos inline de ECGViewer por una **UI tipo dashboard** basada en
**shadcn/ui + Tailwind CSS v4**: sidebar navy colapsable (con botón hamburguesa y secciones
colapsables), encabezado tipo breadcrumb, panel de métricas encuadrado y compacto, barra de estado
inferior, y un **gráfico ECG responsivo** al contenedor. El trabajo es **solo de presentación**: la
lógica de estado, el cálculo de métricas, el motor de dibujo **Canvas 2D** y el backend se reutilizan
sin cambios de comportamiento. Se preserva el contrato de tests de la feature 001 (los `data-testid`/
`aria-label`), por lo que los 86 tests siguen verdes.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend). Sin cambios en backend.

**Primary Dependencies** (nuevas, frontend):
- `tailwindcss` v4 + `@tailwindcss/vite` (sistema de estilos).
- `class-variance-authority`, `clsx`, `tailwind-merge` (variantes + helper `cn`, convención shadcn).
- `lucide-react` (íconos).
- Componentes shadcn copiados al repo (`components/ui/*`), no una dependencia externa de UI.

**Storage**: N/A (sin cambios; la persistencia sigue en el backend/SQLite de la feature 001).

**Testing**: Vitest + Testing Library. Se conserva la suite de 001 (86 tests) intacta y se agregan
tests de interacción para el colapso de sidebar/secciones (`Sidebar.test.tsx`). Sin `ResizeObserver`
en jsdom → el gráfico usa ancho de respaldo (900px).

**Target Platform**: Navegadores de escritorio y **tablet (≥768px)**. Mobile fuera de alcance.

**Project Type**: Web application (frontend + backend); esta feature toca solo `src/frontend`.

**Performance Goals**: Mantener los de la feature 001 (render < 0.1 s p95, interacción ≥10 fps). El
ancho responsivo (ResizeObserver) no introduce repintado continuo; solo redibuja ante cambios reales
de tamaño.

**Constraints**:
- NO modificar el motor Canvas 2D ni la lógica de dominio (Principios II y V).
- Preservar todos los `data-testid`/`aria-label` existentes (FR-009).
- Sin scroll horizontal del área principal en viewports ≥768px.

**Scale/Scope**: 5 historias de usuario (P1–P2), 10 requisitos funcionales; ~1 pantalla. Nuevos
componentes de cascarón + primitivos UI; refactor de presentación de los paneles existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` (v1.2.0, enmendada por esta feature):

| Principio | Cómo lo cumple el plan | Estado |
|-----------|------------------------|--------|
| **I. Test-First (NO-NEGOCIABLE)** | El cambio es presentación/UI (sin lógica de dominio nueva). Conforme a la subsección *Alcance* del Principio I (v1.2.0): (a) el contrato de tests existente se preserva —86 tests heredados de 001 verdes sin editar—; y (b) se agregan tests de interacción para el comportamiento nuevo de UI (colapso de sidebar/secciones, `Sidebar.test.tsx`). | ✅ PASS |
| **II. Integridad de la Señal Original** | No se toca `signalModel`, filtros ni recortes; el rediseño es puramente de UI. | ✅ PASS |
| **III. Persistencia Explícita** | Se conserva "Guardar" como única vía de persistencia y el guard de cambios sin guardar; la sidebar solo re-cablea los mismos handlers. | ✅ PASS |
| **IV. Métricas sobre la Ventana Visible** | El panel de métricas cambia de estilo, no de cálculo: sigue recibiendo las métricas de la ventana visible. | ✅ PASS |
| **V. Rendimiento de Visualización** | El motor Canvas 2D de doble capa queda intacto; NO se introduce librería de charting. El ancho responsivo redibuja solo ante resize real. | ✅ PASS |

**Enmiendas constitucionales asociadas** (dos MINOR):
- **1.0.0 → 1.1.0**: en *Flujo de Desarrollo / Stack*, se fija que la UI usa **shadcn/ui + Tailwind**
  y que el motor de visualización es **Canvas 2D propio y no se reemplaza por una librería de
  charting** (refuerza Principio V).
- **1.1.0 → 1.2.0**: subsección *Alcance* del **Principio I**, que distingue TDD de comportamiento/
  lógica vs. la puerta de calidad para trabajo exclusivamente de presentación/UI (preservar contrato
  de tests + tests de interacción). Derivada del análisis `/speckit.analyze` de esta feature.

**Restricciones de alcance/seguridad**: monocanal ✅; libre acceso ✅; sin secretos ✅; no es
diagnóstico ✅; **sin features fuera de alcance** ✅ (no se inventa HRV/Espectro; mobile diferido).

**Resultado del gate**: PASS — sin violaciones. `Complexity Tracking` vacío.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-shell-redesign/
├── plan.md              # Este archivo
├── research.md          # Log de decisiones D10–D14
├── spec.md              # Historias, FR, criterios
└── tasks.md             # Registro de tareas (implementación ya realizada)
```

### Source Code (repository root) — solo `src/frontend`

```text
src/frontend/src/
├── index.css                    # Tailwind v4 + tokens de tema (navy/teal) — NUEVO
├── lib/
│   └── utils.ts                 # helper cn (clsx + tailwind-merge) — NUEVO
├── components/
│   ├── ui/                      # primitivos shadcn (copiados) — NUEVO
│   │   ├── button.tsx  card.tsx  badge.tsx  input.tsx  select.tsx
│   ├── layout/                  # cascarón — NUEVO
│   │   ├── AppLayout.tsx        # grid sidebar · contenido · footer
│   │   ├── Sidebar.tsx          # sidebar colapsable + grupos colapsables + hamburguesa
│   │   ├── NavItem.tsx          # ítem de navegación (icono + label + tooltip)
│   │   ├── TopBar.tsx           # breadcrumb + estado + velocidad de papel
│   │   └── StatusBar.tsx        # Fs / duración / muestras
│   ├── ECGChart.tsx             # + ancho responsivo (ResizeObserver) — MODIFICADO
│   ├── MetricsPanel.tsx         # tarjetas compactas encuadradas — MODIFICADO
│   ├── FilterPanel.tsx          # controlado por tipo desde la sidebar — MODIFICADO
│   ├── FileLoader.tsx           # "Abrir CSV" + ejemplos como ítems de sidebar — MODIFICADO
│   ├── MarkerEditor.tsx  ConfirmDialog.tsx  MarkerPromptDialog.tsx  # restyle — MODIFICADO
│   └── layout/Sidebar.test.tsx  # tests de interacción (colapso) — NUEVO
└── pages/
    └── MainPage.tsx             # monta el cascarón; lógica intacta — MODIFICADO
```

**NO se toca**: `render/*` (motor Canvas), `signal/*`, `metrics/*`, `hooks/*`, `api/*`, y todo
`src/backend`.

**Structure Decision**: El cascarón vive en `components/layout/`; los primitivos de UI en
`components/ui/` (convención shadcn). `MainPage` conserva todos los hooks/handlers/efectos y solo
reemplaza su árbol JSX para montar `AppLayout + Sidebar + TopBar + StatusBar`. Config añadida: alias
`@/*` (tsconfig + vite), plugin Tailwind en Vite, `index.css` importado en `main.tsx`.

## Complexity Tracking

> Sin violaciones de la constitución: sección no aplicable.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
