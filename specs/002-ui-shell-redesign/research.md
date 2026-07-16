# Phase 0 — Research: Rediseño del cascarón de UI

Consolidación de decisiones técnicas de la feature 002. Continúa la numeración del log de la
feature 001 (D1–D9). El alcance es **presentación/UX**: no cambia lógica de dominio, motor de
dibujo ni backend. La restricción rectora es el **Principio V** (rendimiento del render) y el
**Principio II** (integridad de la señal): ninguna decisión de UI puede degradarlos.

## D10 — Librería de UI del cascarón

- **Decision**: **shadcn/ui + Tailwind CSS v4**. Los componentes de shadcn se copian al repo
  (`src/frontend/src/components/ui/*`: `button`, `card`, `badge`, `input`, `select`) y se editan;
  el tema vive en `src/frontend/src/index.css` con tokens (`@theme inline`) y el helper `cn`
  (`src/frontend/src/lib/utils.ts`). Se agrega el alias `@/*` en `tsconfig.json` y `vite.config.ts`,
  y el plugin `@tailwindcss/vite`.
- **Rationale**: El estilado previo era 100% inline. Se necesitaba un sistema para el cascarón
  (sidebar, tarjetas, diálogos) sin tocar el `<canvas>`. shadcn ofrece control total del look
  (los componentes son propios), calza con la estética custom de los mockups (sidebar navy, acento
  teal) y no compite con el motor Canvas (no hay librería de charting de por medio, se respeta el
  Principio V). Compatible con React 19.
- **Alternatives considered**: (a) **MUI (Material UI)** — descartado: su estética Material choca
  con los mockups, es la opción más pesada y la que más habría que sobrescribir; (b) **Mantine** —
  buen `AppShell` de sidebar, pero su estética por defecto requiere tematizar y añade una dependencia
  mayor que shadcn (que es "copiar componentes"); (c) **CSS plano / CSS Modules** — sin dependencias,
  pero implicaba construir sidebar/tarjetas/diálogos desde cero, más lento y menos consistente.

## D11 — Gráfico ECG responsivo al contenedor

- **Decision**: El `ECGChart` mide su contenedor con un **`ResizeObserver`** y ajusta el ancho del
  bitmap del canvas a lo disponible (`Math.max(320, medido)`), con **fallback a 900px** cuando
  `ResizeObserver` no existe (jsdom/tests). El contenedor usa `width:100%`; los `<canvas>` con
  `inset:0` hacen que el ancho CSS siga al contenedor, y el atributo `width` fija el bitmap → ambos
  coinciden (sin distorsión). En `MainPage`, el Card del gráfico usa `flex-1 min-w-0` para ocupar el
  ancho libre.
- **Rationale**: El ancho fijo (900px) se **desbordaba en tablet** (área ~513px). Medir el
  contenedor y redibujar al nuevo ancho corrige el overflow (SC-001) y mantiene la nitidez (SC-002).
  El `ResizeObserver` solo dispara re-render de la capa base ante cambios reales de tamaño, sin
  afectar el Principio V (no hay repintado continuo).
- **Alternatives considered**: (a) **Contenedor con `overflow-x:auto`** (scroll horizontal del
  gráfico) — descartado: el usuario pidió aprovechar el ancho, no scrollear; (b) **breakpoints con
  anchos fijos por tamaño** — frágil y no cubre tamaños intermedios; (c) medir en `MainPage` en vez
  de en `ECGChart` — se prefirió encapsular la responsividad en el propio componente del gráfico.

## D12 — `select`/`input` nativos estilados en vez de los de Radix

- **Decision**: Los componentes `ui/select` y `ui/input` son **elementos nativos** (`<select>`,
  `<input>`) estilados con Tailwind, en lugar de los equivalentes basados en Radix que trae shadcn.
- **Rationale**: Los tests de la feature 001 consultan por `aria-label` y opciones nativas
  (p. ej. "Tipo de filtro", "Velocidad de papel"). Un `Select` de Radix no es un `<select>` real y
  rompería esas aserciones y parte de la accesibilidad por teclado "gratis" del nativo. Mantener el
  elemento nativo preserva el contrato de test (FR-009) y simplifica el DOM.
- **Alternatives considered**: Radix Select/Popover — mejor control visual del menú, pero rompe
  tests y añade portales que complican jsdom; descartado para esta feature.

## D13 — Lenguaje visual / tokens de tema

- **Decision**: Paleta calcada de los mockups mediante variables CSS en `:root` mapeadas a
  utilidades Tailwind: **sidebar navy** (`--sidebar: #0e2c49`), **acento teal** (`--primary:
  #0d9488`), fondo gris-azulado, tarjetas blancas, borde `#e2e8f0`, radios y sombras suaves. Íconos
  con `lucide-react`.
- **Rationale**: Un set de tokens centralizado da coherencia (light) y permite ajustar el tema en un
  solo lugar. `lucide-react` es el set de íconos idiomático de shadcn.
- **Alternatives considered**: Colores hardcodeados por componente — descartado por inconsistencia y
  costo de mantenimiento. (Nota: los valores concretos de spacing/tamaño de tarjetas NO se elevan a
  la constitución; son detalle de esta feature.)

## D14 — Alcance de responsividad: tablet + PC (mobile diferido)

- **Decision**: El objetivo soportado es **tablet (≥768px) y PC**. **Mobile (<768px) queda fuera de
  alcance** en esta feature.
- **Rationale**: Los mockups son dashboards de escritorio. Adaptar a mobile requiere convertir la
  sidebar en un *drawer* con overlay y reflujos adicionales; es un incremento propio. Se verificó
  que tablet y PC quedan sin overflow; mobile se documenta explícitamente como trabajo futuro para
  no dejar una expectativa implícita.
- **Alternatives considered**: Cubrir mobile ahora (sidebar drawer + hamburguesa en un topbar
  mobile) — mayor alcance del pedido; se difiere. Solo-desktop sin tablet — insuficiente: el usuario
  usa tablet.

## Nota sobre TDD (Principio I) en esta feature

El trabajo fue **presentación/UI**, cubierto explícitamente por la subsección *Alcance* del
**Principio I** (constitución **v1.2.0**): el ciclo rojo→verde→refactor rige el comportamiento/
lógica de dominio; para presentación pura, la puerta de calidad equivalente es preservar el contrato
de tests + tests de interacción para el comportamiento nuevo de UI. La estrategia aplicada fue:

1. **Preservar el contrato de test existente**: los `data-testid`/`aria-label` que asertan los tests
   de 001 se mantuvieron; la suite heredada (86 tests) quedó verde sin editarla (FR-009, SC-003).
2. **Agregar tests de interacción reales** para el comportamiento nuevo de UI (colapso de sidebar y
   de secciones) — ver `tasks.md` T210–T212 y `src/frontend/src/components/layout/Sidebar.test.tsx`.
3. **Verificación visual/estructural por preview** para fidelidad (colores, spacing, ausencia de
   overflow, igualdad de alturas), que es el límite legítimo de TDD para presentación.

Con esta puerta, el incremento **cumple** el Principio I (v1.2.0): no cambió lógica de dominio, y el
riesgo de regresión queda cubierto por (1) + (2). Nota histórica: la aclaración de alcance del
Principio I nació justamente del `/speckit.analyze` de esta feature (hallazgo D1).

## Resumen de resolución

Todas las decisiones de UI/UX quedan registradas (D10–D14). No hay `NEEDS CLARIFICATION` abiertos.
El cambio respeta los Principios II y V (canvas y señal intactos) y agrega una enmienda MINOR a la
constitución para fijar el stack de UI como hecho transversal (ver `plan.md` → Constitution Check).
