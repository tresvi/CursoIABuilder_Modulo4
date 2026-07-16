<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0
Bump rationale (1.1.0): Enmienda MINOR asociada a la feature 002 (rediseño del
cascarón de UI). Se amplía la guía de stack en "Flujo de Desarrollo": se fija
shadcn/ui + Tailwind como sistema de UI y se explicita que el motor de
visualización del ECG es Canvas 2D propio y NO se reemplaza por una librería de
charting (refuerza el Principio V). No se agregan ni redefinen principios.
Templates: sin cambios (los placeholders de stack son genéricos).

--- Historial ---
Version change (1.0.0): (plantilla sin ratificar) → 1.0.0
Bump rationale: Ratificación inicial. Se reemplazan todos los placeholders de la
plantilla por principios concretos del proyecto ECGViewer.

Principles defined (initial):
  I.   Test-First (NO-NEGOCIABLE)        [nuevo — solicitado por el usuario]
  II.  Integridad de la Señal Original   [nuevo]
  III. Persistencia Explícita            [nuevo]
  IV.  Métricas sobre la Ventana Visible [nuevo]
  V.   Rendimiento de Visualización      [nuevo]

Sections defined:
  - Restricciones de Alcance y Seguridad (Section 2)
  - Flujo de Desarrollo y Puertas de Calidad (Section 3)
  - Governance

Templates reviewed:
  ✅ .specify/templates/plan-template.md   — "Constitution Check" es genérico; sin cambios
  ✅ .specify/templates/spec-template.md    — sin referencias a principios concretos; sin cambios
  ✅ .specify/templates/tasks-template.md    — sin referencias a principios concretos; sin cambios
  ✅ .specify/templates/checklist-template.md — sin referencias a principios concretos; sin cambios

Deferred TODOs: ninguno.
-->

# ECGViewer Constitution

## Core Principles

### I. Test-First (NO-NEGOCIABLE)

Todo cambio de comportamiento se desarrolla con TDD. La secuencia es obligatoria y no
admite excepciones:

- Los tests se escriben ANTES que la implementación.
- Se sigue estrictamente el ciclo **rojo → verde → refactor**: primero un test que falla
  (rojo), luego el mínimo código que lo hace pasar (verde), luego se refactoriza sin
  cambiar el comportamiento observable.
- Cada test nuevo DEBE fallar por la razón esperada antes de escribir el código de
  producción que lo satisface. No se agrega código de producción sin un test que lo exija.
- El refactor solo se realiza con la suite en verde.

Rationale: TDD fija el contrato antes de la implementación, evita código no ejercitado y
mantiene la señal de regresión confiable en una aplicación cuyos cálculos (filtros DSP,
métricas de variabilidad) deben ser correctos y reproducibles.

### II. Integridad de la Señal Original

La señal cargada es inmutable. Filtros (RF-10) y recortes (RF-09) se aplican de forma no
destructiva y DEBEN poder revertirse a la señal originalmente cargada. Ninguna operación
sobrescribe la fuente en memoria de manera irreversible.

Rationale: el usuario debe poder comparar, deshacer y confiar en que la fuente no se
degrada tras aplicar procesamiento.

### III. Persistencia Explícita

Nada se persiste automáticamente. Marcadores, filtros y recortes solo se guardan cuando el
usuario presiona explícitamente "Guardar". Si existen cambios pendientes al cerrar o
recargar, la app DEBE alertar y pedir confirmación. El recorte no se aplica de inmediato:
tras seleccionar con el mouse se muestra un cartel de confirmación y solo se recorta si el
usuario acepta (RF-09, AC-13).

Rationale: preserva la intención del usuario y evita pérdida o alteración accidental de
datos de trabajo.

### IV. Métricas sobre la Ventana Visible

Las métricas (BPM, SDNN, RMSSD, pNN50) SIEMPRE se calculan sobre la ventana de tiempo
visible, nunca sobre todo el archivo. Al cambiar la ventana, las métricas se recalculan
para ese rango.

Rationale: el análisis clínico-educativo se hace sobre segmentos; calcular sobre todo el
archivo produciría valores sin sentido para la vista actual.

### V. Rendimiento de Visualización

El renderizado DEBE completarse en menos de 0.1 s para 1 minuto de señal y sin parpadeos.
No se emplean librerías gráficas que no cumplan este requisito. El rendimiento es un
criterio de aceptación, no una optimización posterior.

Rationale: la exploración interactiva de la señal pierde valor si el render es lento o
inestable.

## Restricciones de Alcance y Seguridad

- **Un solo canal**: la app soporta señal monocanal. Ante un CSV/XLSX multicanal DEBE
  informar y no procesar.
- **Libre acceso**: no hay inicio de sesión, usuarios, roles ni datos por usuario. La
  autenticación está Fuera de Alcance.
- **Secretos**: la API key de Claude NUNCA se hardcodea; vive en `.env` como
  `ANTHROPIC_API_KEY`.
- **No es herramienta de diagnóstico**: ECGViewer no se presenta como herramienta de
  diagnóstico clínico certificado.
- **Fuera de alcance**: captura en tiempo real por hardware, multi-usuario/roles/nube,
  HL7/DICOM, export a firmware y multi-tenant. No se agregan features fuera del alcance
  definido en el PRD.

## Flujo de Desarrollo y Puertas de Calidad

- **Stack**: Front React 19.2 + TypeScript (Vite) en `src/frontend`; Back .NET 10 (Minimal
  API) en `src/backend`; persistencia en SQLite.
- **UI**: la capa de presentación usa **shadcn/ui + Tailwind CSS** (componentes propios en
  `src/frontend/src/components/ui/`, tokens de tema en `src/frontend/src/index.css`). El motor de
  visualización del ECG es **Canvas 2D propio** y **NO se reemplaza por una librería de charting**
  (Chart.js, Recharts, Plotly, etc.): hacerlo violaría el Principio V. Las decisiones de UI/UX se
  registran en el `research.md` de su feature, no en esta constitución.
- **Puertas de calidad**: `dotnet test` (xUnit) y `npm test` (Vitest) DEBEN pasar antes de
  integrar un cambio. Todo cambio de comportamiento llega acompañado de sus tests
  (Principio I).
- **Aislamiento de la API de Claude**: los tests NUNCA llaman a la API real de Claude; se
  usan mocks/fakes.
- **Dependencias**: las versiones exactas viven en los archivos de proyecto (`.csproj`,
  `package.json`); la documentación describe el "qué y por qué", no duplica versiones.

## Governance

Esta constitución supersede otras prácticas en caso de conflicto. Toda enmienda DEBE
documentarse en este archivo, justificar el cambio de versión y actualizar las plantillas
dependientes en `.specify/templates/` cuando corresponda.

Versionado (semver de la constitución):
- **MAJOR**: eliminación o redefinición incompatible de principios o gobernanza.
- **MINOR**: se agrega un principio/sección o se amplía materialmente una guía.
- **PATCH**: aclaraciones y correcciones que no cambian el significado.

Cumplimiento: todo PR/revisión DEBE verificar el cumplimiento de estos principios; en
particular, la ausencia de tests previos a la implementación (Principio I) es motivo de
rechazo. La complejidad adicional debe justificarse. Para la guía operativa de desarrollo,
consultar `AGENTS.md` / `CLAUDE.md`.

**Version**: 1.1.0 | **Ratified**: 2026-07-11 | **Last Amended**: 2026-07-16
