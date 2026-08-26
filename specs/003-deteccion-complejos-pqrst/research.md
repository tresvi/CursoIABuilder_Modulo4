# Research: Detección y marcado de complejos PQRST

Contexto revisado: `src/frontend/src/metrics/rPeakDetection.ts` (Pan-Tompkins
simplificado, ya usado para BPM/HRV), `src/frontend/src/metrics/windowMetrics.ts`,
`src/frontend/src/components/ECGChart.tsx` (canvas de doble capa: base + overlay),
`src/frontend/src/render/drawMarkers.ts` (marcadores manuales), `src/frontend/src/api/
filterApi.ts` (filtros vía backend), `src/frontend/src/components/layout/Sidebar.tsx`
y `NavItem.tsx`, `src/frontend/src/components/FileLoader.tsx` /
`FilterPanel.tsx` (patrón de aviso `role="alert"` ya existente).

## D1: Dónde vive la detección

**Decision**: Frontend, en TypeScript puro, extendiendo el mismo enfoque que
`detectRPeaks` (no se agrega ningún endpoint nuevo al backend).

**Rationale**: El pico R ya se detecta hoy en el frontend sin llamar al backend
(a diferencia de los filtros DSP, que sí usan FftSharp en el back). Q, R y S se
pueden ubicar con búsquedas de extremos locales en el dominio del tiempo, sin
necesitar FFT ni ninguna dependencia nueva. Mantenerlo en el frontend evita una
ronda de red adicional justo cuando FR-007 exige recalcular apenas cambia la señal
filtrada (que ya implica una ronda de red para el filtro en sí).

**Alternatives considered**: Endpoint de backend nuevo (`/api/complexes`) — se
descartó por agregar una ronda de red extra sin necesidad real (el algoritmo no
requiere las capacidades DSP que sí justifican el backend para los filtros) y por
duplicar la ubicación del pico R que ya vive en el frontend.

## D2: Cómputo fuera del hilo principal

**Decision**: Ejecutar la detección en un **Web Worker** dedicado
(`src/frontend/src/workers/complexDetection.worker.ts`), en vez de sobre el hilo
principal.

**Rationale**: El Principio V exige render sin parpadeos y ≥10 fps de interacción.
FR-012/SC-001 (sesión de clarify 2026-08-26) admiten un estado de "procesando" para
señales más largas que el archivo de referencia de 1 minuto, pero ese estado solo
puede mostrarse mientras la interfaz sigue respondiendo — algo que un cálculo
síncrono en el hilo principal no permite (bloquea el render mientras corre). Un
Worker deja el hilo principal libre para pintar el canvas y para que el usuario
seguir interactuando (incluso cancelar/desactivar) mientras se calcula.

**Alternatives considered**: Cálculo síncrono en el hilo principal — más simple,
pero arriesga romper el Principio V en señales largas y no permite mostrar
"procesando" de forma real (JS de un solo hilo se bloquea). División en chunks con
`setTimeout`/`requestIdleCallback` — evita el Worker, pero es más difícl de razonar
(cancelación, orden) que aislar la misma función pura dentro de un Worker.

## D3: Algoritmo para ubicar P, Q, S y T

**Decision**: Para cada pico R ya detectado (`detectRPeaks`), buscar:
- **Q**: mínimo local en una ventana corta inmediatamente anterior al R (~40–60 ms).
- **S**: mínimo local en una ventana corta inmediatamente posterior al R (~40–60 ms).
- **P**: máximo local en una ventana más amplia antes de Q (proporcional al
  intervalo RR local, acotada para no invadir el latido anterior).
- **T**: máximo local en una ventana más amplia después de S (proporcional al
  intervalo RR local, acotada para no invadir el latido siguiente).

Si P o T no aparecen con un contraste mínimo razonable dentro de su ventana de
búsqueda, ese punto se reporta como no encontrado para ese latido en particular
(no se inventa una posición); Q, R y S sí se esperan siempre que el R sea válido.

**Rationale**: Reutiliza exactamente la misma anchor (R) que ya alimenta las
métricas HRV, es coherente con el enfoque simplificado ya elegido para R
(research.md D3 de la feature 001) y no requiere aprendizaje automático ni
procesamiento espectral, evitando complejidad fuera de lo que pide el spec.

**Alternatives considered**: Delineación por wavelets (más robusta en literatura
clínica, pero es una complejidad muy por encima de lo que pide esta feature y del
resto del stack del proyecto, que no usa ninguna librería de wavelets).

## D4: Representación visual de las marcas

**Decision**: Puntos discretos dibujados directamente sobre el trazado, en la
coordenada real (tiempo, amplitud) de cada P/Q/R/S/T, en el **lienzo overlay**
(junto a `drawMarkers`, en un nuevo `render/drawComplexMarks.ts`). Color y forma
distintos de los marcadores manuales (naranja, línea vertical completa) para
cumplir FR-011.

**Rationale**: Con 5 puntos por latido, una línea vertical de altura completa por
punto (como los marcadores manuales) saturaría el gráfico apenas hay más de un par
de latidos visibles. Un punto pequeño sobre la curva escala mejor y es más legible.
El overlay ya se redibuja en cada pan/zoom y ya filtra por ventana visible
(`view.tRange`), igual que `drawMarkers`, así que agregar esta capa no cambia el
ciclo de render de la capa base (Principio V).

**Alternatives considered**: Dibujar en el lienzo base — se descartó porque ese
lienzo solo se redibuja al cambiar datos/ventana, no en cada pan/zoom en vivo (según
el comentario de `ECGChart.tsx`), lo que dejaría las marcas desalineadas durante el
arrastre.

## D5: Recalcular tras aplicar/cambiar/restaurar un filtro

**Decision**: Un efecto en `MainPage.tsx` dispara la detección (vía el Worker de D2)
cada vez que la señal derivada (post-filtro) cambia, siempre que "Detec. Complejos"
esté activo — mismo patrón que ya usa `metricsForWindow` al recalcular sobre la
ventana visible.

**Rationale**: Es exactamente lo que pide FR-007 (resuelto en `/speckit-specify`):
el filtrado puede desplazar los complejos, así que la detección debe seguir a la
señal que el usuario está viendo en cada momento (original o filtrada).

## D6: Indicador de "procesando"

**Decision**: Mientras el Worker calcula, el botón "Detec. Complejos" se deshabilita
y cambia su ícono/etiqueta a un estado de carga, reutilizando `NavItem` tal cual
existe hoy (sin agregar props nuevas al componente compartido).

**Rationale**: Minimiza la superficie de cambio: no hace falta tocar `StatusBar`
(que hoy solo muestra estadísticas de la señal, no estados de operaciones) ni
introducir un componente de spinner nuevo en el sistema de diseño.

**Alternatives considered**: Agregar el estado a `StatusBar` — se descartó por
mezclar responsabilidades (estadísticas de la señal vs. estado de una herramienta).

## D7: Aviso de baja confianza (FR-008/SC-004)

**Decision**: Reutilizar el patrón ya existente en la app — un `<p role="alert">`
con texto de error/aviso cerca del control, igual que ya hacen `FileLoader.tsx`
(rechazo de multicanal) y `FilterPanel.tsx` (errores de filtro) — en vez de
introducir un componente de notificación nuevo (toast, modal, etc.).

**Rationale**: Consistencia con el resto de la app y cero dependencias nuevas.

## Resumen de Technical Context

Todas las incógnitas quedaron resueltas con lo anterior; no quedan
`NEEDS CLARIFICATION` pendientes para el Technical Context de `plan.md`.
