# Feature Specification: Rediseño del cascarón de UI (dashboard con sidebar)

**Feature Branch**: `002-ui-shell-redesign`

**Created**: 2026-07-16

**Status**: Implemented

**Input**: User description: "Rediseñar la interfaz para que se parezca a mockups de dashboard
de ECG con sidebar oscura colapsable, tarjetas de métricas y barra de estado, usando una
librería de componentes React." (continuación de la feature 001; solo presentación/UX)

## Clarifications

### Session 2026-07-16

- Q: ¿Qué librería de UI se adopta? → A: **shadcn/ui + Tailwind CSS** (decisión del usuario;
  ver research D10).
- Q: ¿Se soporta mobile? → A: **No.** Alcance = tablet + PC. Mobile queda fuera de alcance
  (ver Assumptions y research D14).
- Q: ¿Se agrega la métrica "HRV" que aparece en los mockups? → A: **No** se inventa. SDNN/RMSSD/
  pNN50 ya son métricas de HRV; agregar un "HRV" genérico sería redundante. Si se quisiera, sería
  un alias de SDNN, no un cálculo nuevo (fuera de alcance de esta feature).
- Q: ¿Cómo se controla el colapso de la sidebar? → A: Un **botón hamburguesa** arriba de la
  barra (no un botón "Colapsar" al pie).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar la app como un dashboard con sidebar (Priority: P1)

Un estudiante o docente abre ECGViewer y ve una interfaz tipo tablero: una **barra lateral**
a la izquierda con las acciones agrupadas en **Archivo**, **Filtros** y **Herramientas**; el
gráfico ECG al centro; las métricas a la derecha; y una barra de estado abajo (Fs, duración,
muestras). Todas las acciones que antes vivían en una barra de herramientas superior están ahora
accesibles desde la sidebar.

**Why this priority**: Es el objetivo central de la feature: reemplazar el cascarón de estilos
inline por una estructura navegable y prolija sin cambiar ninguna funcionalidad.

**Independent Test**: Cargar una señal y verificar que cada acción (abrir CSV, cargar ejemplo,
importar/exportar, guardar, filtros, zoom/pan/regla/recorte/marcar, rejilla) se dispara desde su
ítem en la sidebar, con los mismos efectos que antes.

**Acceptance Scenarios**:

1. **Given** la app abierta sin señal, **When** el usuario observa la pantalla, **Then** ve la
   sidebar con los grupos Archivo/Filtros/Herramientas, un encabezado, el área de gráfico vacía
   con su prompt, el panel de métricas y la barra de estado.
2. **Given** una señal cargada, **When** el usuario usa un ítem de "Herramientas" (p. ej. Regla),
   **Then** la herramienta se activa igual que con la toolbar anterior (comportamiento intacto).
3. **Given** una señal cargada, **When** el usuario elige un filtro en la sidebar, **Then** el
   panel de Filtro digital queda preseleccionado con ese tipo para ajustar cortes y aplicar.

---

### User Story 2 - Colapsar/expandir la sidebar con un menú hamburguesa (Priority: P1)

El usuario quiere ganar espacio horizontal para el gráfico. Hace clic en un **botón hamburguesa**
ubicado arriba de la barra lateral y ésta se colapsa a un riel angosto de solo íconos; al hacer
clic de nuevo, se expande. En modo colapsado, cada ícono muestra su etiqueta como tooltip.

**Why this priority**: Es la interacción de navegación principal pedida explícitamente y la que
libera ancho para la visualización.

**Independent Test**: Hacer clic en la hamburguesa y verificar que la barra alterna entre ~240px
(expandida) y ~64px (colapsada), que el `aria-expanded` cambia y que en modo colapsado los ítems
quedan como íconos con tooltip.

**Acceptance Scenarios**:

1. **Given** la sidebar expandida, **When** el usuario hace clic en la hamburguesa, **Then** la
   barra se colapsa a solo íconos y el control expone `aria-label="Expandir menú"`.
2. **Given** la sidebar colapsada, **When** el usuario hace clic en la hamburguesa, **Then** la
   barra se expande mostrando íconos + etiquetas y el control expone `aria-label="Colapsar menú"`.
3. **Given** la sidebar colapsada, **When** el usuario apoya el cursor sobre un ícono, **Then**
   ve la etiqueta de la acción como tooltip.

---

### User Story 3 - Colapsar secciones de la sidebar (Priority: P2)

Con la sidebar expandida, el usuario puede colapsar individualmente cada sección (Archivo,
Filtros, Herramientas) haciendo clic en su encabezado, para reducir el ruido visual y encontrar
más rápido lo que busca.

**Why this priority**: Mejora de organización; no bloquea el uso básico (P2).

**Independent Test**: Hacer clic en el encabezado "Filtros" y verificar que sus ítems se ocultan
y el `aria-expanded` del encabezado pasa a `false`; clic de nuevo los muestra.

**Acceptance Scenarios**:

1. **Given** la sección "Filtros" abierta, **When** el usuario hace clic en su encabezado,
   **Then** los ítems de filtros se ocultan y el chevron rota.
2. **Given** la sidebar colapsada (solo íconos), **When** el usuario la observa, **Then** no hay
   encabezados de sección; los ítems se muestran separados por un divisor.

---

### User Story 4 - Aprovechar el ancho en tablet y PC (Priority: P1)

El usuario trabaja en una tablet o una PC. El gráfico ECG ocupa el ancho disponible del área de
contenido (no un ancho fijo), y no hay desbordamiento horizontal de la página.

**Why this priority**: Sin responsividad, en tablet el gráfico de ancho fijo se desbordaba; es
un defecto observable que esta feature corrige.

**Independent Test**: En viewport de 768px (tablet) y 1280px (PC), cargar señal y verificar que
el área principal no tiene scroll horizontal y que el bitmap del canvas coincide con su ancho CSS
(sin distorsión).

**Acceptance Scenarios**:

1. **Given** viewport ≥ 768px con señal cargada, **When** se renderiza el gráfico, **Then** el
   `main` no presenta scroll horizontal (`scrollWidth ≤ clientWidth`).
2. **Given** un cambio de tamaño del contenedor, **When** cambia el ancho disponible, **Then** el
   gráfico se re-mide y redibuja al nuevo ancho, coincidiendo el bitmap con el ancho CSS.

---

### User Story 5 - Panel de métricas compacto y alineado (Priority: P2)

El usuario ve las métricas cardíacas en una **columna angosta encuadrada en un cuadro blanco**
(igual que el gráfico y el panel de filtros), que ocupa el **mismo alto** que el gráfico, con las
tarjetas internas distribuidas para llenar ese alto. El ancho de la columna es mínimo para que el
gráfico se lleve el espacio.

**Why this priority**: Prolijidad y alineación pedidas; no bloquea el análisis (P2).

**Independent Test**: Con señal cargada, verificar que el panel de métricas y el gráfico tienen
la misma altura, que el panel es una tarjeta blanca y que su ancho es compacto (~128px).

**Acceptance Scenarios**:

1. **Given** una señal cargada en PC, **When** se muestran las métricas, **Then** la columna de
   métricas iguala el alto del gráfico y está encuadrada en un cuadro blanco.
2. **Given** cualquier viewport soportado, **When** una métrica no es calculable, **Then** se
   muestra "—" (se conserva el comportamiento FR-006 de la feature 001).

### Edge Cases

- **Sin señal**: la sidebar y sus acciones dependientes de señal quedan deshabilitadas; el área
  de contenido muestra el prompt de carga.
- **Sidebar colapsada + menú de ejemplos**: "Cargar ejemplo" sigue abriendo su lista aun en modo
  íconos.
- **jsdom / tests**: sin `ResizeObserver` disponible, el gráfico usa el ancho de respaldo (900px)
  y los tests existentes siguen funcionando.
- **Viewport mobile (<768px)**: fuera de alcance; puede verse apretado (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La UI DEBE presentar un cascarón tipo dashboard: sidebar (izquierda), encabezado
  (breadcrumb + estado), área de gráfico, panel de métricas (derecha) y barra de estado (abajo).
- **FR-002**: La sidebar DEBE agrupar acciones en **Archivo** (abrir CSV, cargar ejemplo, importar
  XLSX, guardar, guardar como CSV, exportar XLSX), **Filtros** (pasa bajo/alto/banda/notch,
  restaurar) y **Herramientas** (rejilla ECG, zoom, desplazar, regla, recortar, marcar, restablecer
  zoom). Cada ítem DEBE disparar el handler ya existente; NO se crea lógica de dominio nueva.
- **FR-003**: La sidebar DEBE poder colapsarse/expandirse mediante un **botón hamburguesa** ubicado
  en su parte superior, exponiendo `aria-label`/`aria-expanded` acordes al estado.
- **FR-004**: En modo colapsado, los ítems DEBEN mostrarse como íconos con **tooltip** (etiqueta).
- **FR-005**: Cada sección (Archivo/Filtros/Herramientas) DEBE ser colapsable individualmente
  cuando la sidebar está expandida.
- **FR-006**: Elegir un filtro en la sidebar DEBE preseleccionar ese tipo en el panel de Filtro
  digital (el ajuste de cortes y "Aplicar" siguen en el panel).
- **FR-007**: El gráfico ECG DEBE ajustar su ancho al contenedor (responsivo), sin desbordamiento
  horizontal en viewports ≥ 768px, y sin distorsión (bitmap = ancho CSS).
- **FR-008**: El panel de métricas DEBE estar encuadrado en un cuadro blanco, ser de ancho compacto
  e igualar el alto del gráfico.
- **FR-009**: El rediseño DEBE preservar todos los `data-testid` y `aria-label` existentes, de modo
  que la suite de tests de la feature 001 siga verde sin modificaciones.
- **FR-010**: El rediseño NO DEBE modificar la lógica de dominio, el motor de dibujo Canvas 2D, ni
  el backend (solo presentación/estructura).

### Key Entities

No introduce entidades de dominio nuevas. El estado de UI agrega banderas transitorias no
persistidas: `collapsed` (sidebar), `filterType` (tipo de filtro seleccionado), `fileName`
(nombre de la fuente para el encabezado), y el estado por-sección de colapso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En viewports de 768px y 1280px con señal cargada, el área de contenido principal NO
  presenta scroll horizontal.
- **SC-002**: El bitmap del canvas del gráfico coincide con su ancho CSS renderizado (sin
  distorsión) tras el ajuste responsivo.
- **SC-003**: La suite existente (86 tests, Vitest) permanece **100% verde** y `npm run typecheck`
  queda limpio tras el rediseño, sin editar los tests de 001.
- **SC-004**: La columna de métricas iguala el alto del gráfico (diferencia < 2px) y su ancho es
  ≤ 130px.
- **SC-005**: El colapso/expansión de la sidebar y de cada sección es operable por teclado y
  expone estado accesible (`aria-expanded`).

## Assumptions

- **Mobile fuera de alcance**: el objetivo es **tablet + PC** (viewports ≥ 768px). En pantallas
  menores la UI puede verse apretada; adaptarla a mobile (sidebar como drawer, etc.) es trabajo
  futuro, no parte de esta feature.
- **Sin métricas nuevas**: no se agrega "HRV" ni "Espectro" que aparecen en los mockups pero no
  existen en el modelo de datos actual (Constitución: no agregar features fuera de alcance).
- **Reutilización total de la lógica de 001**: hooks, handlers, cálculo de métricas, render Canvas,
  API y persistencia se reutilizan sin cambios de comportamiento.
- **Estilado**: se introduce Tailwind v4 + shadcn/ui como sistema de estilos (antes: estilos
  inline). Ver `plan.md` y `research.md`.
