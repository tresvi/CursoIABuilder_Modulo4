# Research: Vista de espectro de potencia y limpieza de la sidebar

Contexto revisado: `src/backend/ECGViewer.Api/Endpoints/FilterEndpoints.cs`,
`Dsp/SignalFilter.cs` (usa `FftSharp`), `Dsp/SignalMath.cs`, `Models/ApiModels.cs`;
`src/frontend/src/components/ECGChart.tsx`, `render/ecgScale.ts`,
`src/frontend/src/components/layout/Sidebar.tsx` (post feature 003),
`src/frontend/src/components/FilterPanel.tsx`, `src/frontend/src/pages/MainPage.tsx`,
`src/frontend/src/api/filterApi.ts`.

## D1: Dónde corre el cálculo del espectro

**Decision**: Backend, en un endpoint nuevo `POST /api/spectrum` que reutiliza
`FftSharp` (ya dependencia del proyecto para los filtros).

**Rationale**: El backend ya tiene toda la infraestructura de FFT que hace falta
(`FftSharp`, `SignalMath.ResolveFs`, el patrón de validación de `SignalFilter.Validate`).
Calcular el espectro en el frontend exigiría agregar una librería de FFT nueva en
JavaScript, duplicando capacidad que el backend ya tiene. Sigue además el mismo patrón
de round-trip de red que ya usan los filtros (`/api/filter`), consistente con cómo esta
app ya reparte el trabajo DSP.

**Alternatives considered**: Cálculo en el frontend (Web Worker, como la feature 003) —
se descartó porque acá no hay razón para evitar la red (el cálculo YA se saca del hilo
principal al ir al backend) y porque agregaría una dependencia de FFT nueva al frontend
sin necesidad.

## D2: Qué datos se envían

**Decision**: Solo las muestras de la **ventana de tiempo visible** (no toda la señal
cargada), igual que ya hace `metricsForWindow` para BPM/SDNN/RMSSD/pNN50.

**Rationale**: Es el alcance que fija el spec (Assumptions) y es coherente con el
Principio IV — a diferencia de la feature 003 (que necesitaba toda la señal para poder
marcar latidos en cualquier parte del trazado), acá no hace falta: el usuario quiere ver
el contenido en frecuencia de lo que está mirando en ese momento.

## D3: Cómo se renderiza — componente nuevo, no extender ECGChart

**Decision**: `SpectrumChart.tsx` + `render/drawSpectrum.ts` nuevos, montados **en vez
de** `ECGChart` cuando la vista de espectro está activa (composición en `MainPage.tsx`),
en vez de agregarle un "modo" a `ECGChart`.

**Rationale**: FR-006 y FR-007 dicen que ninguna herramienta de interacción (zoom/pan/
regla/recorte/marcador) ni las marcas de complejos aplican mientras se ve el espectro.
Si eso se resolviera con un flag dentro de `ECGChart`, habría que condicionar cada
manejador de puntero y la llamada a `drawComplexMarks` según el modo — más superficie de
cambio y más riesgo de regresión en un componente ya complejo y bien cubierto. Con un
componente separado, FR-006/FR-007 se cumplen gratis: `SpectrumChart` simplemente no
recibe `tool`, `markers` ni `complexMarks`, y no tiene manejadores de puntero.

`SpectrumChart` no necesita el canvas de doble capa de `ECGChart` (base + overlay): no
hay interacción en vivo que pintar sobre él (FR-007), así que un solo canvas que se
redibuja al cambiar el espectro alcanza.

**Alternatives considered**: Modo dentro de `ECGChart` — descartado por lo anterior.

## D4: Escala del gráfico — reutilizar `ecgScale.ts`

**Decision**: Reutilizar `createScale`/`plotRect`/`ViewBox` de `render/ecgScale.ts` para
el eje frecuencia/potencia, en vez de escribir un sistema de escala paralelo.

**Rationale**: `createScale` ya es una interpolación lineal genérica entre un rango de
datos (`tRange`/`vRange`) y píxeles; no tiene nada específico de tiempo/amplitud salvo
el nombre de los campos. Pasarle `tRange = [0, fs/2]` (frecuencia) y `vRange = [0,
maxPower]` (potencia) funciona sin cambios. Evita duplicar código de escalado.

## D5: Estado de carga — reutilizar el patrón de filtros, no el Worker de la feature 003

**Decision**: Estado local simple `spectrumBusy`/`spectrumError` en `MainPage.tsx`,
igual al que ya existe para `handleApplyFilter` (`filterBusy`/`filterError`).

**Rationale**: El cómputo pesado ya se saca del hilo principal al ir al backend (D1);
no hace falta el mecanismo de Worker con fallback inline que sí se justificaba en la
feature 003 (ahí el cómputo era 100% frontend y debía no bloquear el render). Acá basta
con el mismo patrón ya usado y probado para las llamadas a `/api/filter`.

## D6: Ventana insuficiente (FR-009)

**Decision**: Nuevo código de error de backend `InsufficientSamples` (400), devuelto
por `/api/spectrum` cuando la ventana visible tiene muy pocas muestras para un espectro
con sentido (umbral mínimo a definir en la implementación, análogo a las validaciones
ya existentes en `SignalFilter.Validate`). El frontend lo muestra con el mismo patrón
`role="alert"` ya usado en `FileLoader.tsx`/`FilterPanel.tsx`.

**Rationale**: Consistencia con el resto de la app; ningún componente nuevo de
notificación.

## Resumen de Technical Context

Todas las incógnitas quedaron resueltas; no quedan `NEEDS CLARIFICATION` pendientes
para `plan.md`.
