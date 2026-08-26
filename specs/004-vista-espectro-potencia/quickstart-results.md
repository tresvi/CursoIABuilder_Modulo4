# Resultados de validación (quickstart) — Vista de espectro de potencia y limpieza de la sidebar

Ejecución de [`quickstart.md`](./quickstart.md) el 2026-08-26. Entorno: .NET 10.0.301, Node 24.
Resumen: **todas las validaciones automatizables pasan**; queda pendiente la confirmación
visual en un navegador real (mismo tipo de limitación que T077/T078 de la feature 001 y el
Escenario 4 de la feature 003).

## Suites de tests

| Suite | Resultado |
|-------|-----------|
| Backend `dotnet test` (xUnit) | **40 passed** (10 nuevos: `PowerSpectrumTests`, `SpectrumEndpointTests`) |
| Frontend `npm test` (Vitest) | **143 passed** (14 archivos nuevos/tocados: `spectrumApi` vía mock, `drawSpectrum`, `SpectrumChart`, `Sidebar`, `MainPage`) |
| Backend `dotnet build` | 0 warnings |
| Frontend `tsc --noEmit` / ESLint | 0 warnings |
| Frontend `vite build` | OK |

## Cobertura por escenario de `quickstart.md`

- **Escenario 1** (US2 — sidebar despejada, FR-001): `Sidebar.test.tsx` verifica que
  "Diagnósticos" ya no lista los filtros ni "Restaurar"; los tests de `MainPage.test.tsx`
  que aplican/revierten un filtro desde el panel de filtro (heredados de la feature 003)
  siguen en verde sin cambios, confirmando que no se perdió funcionalidad (SC-004). ✅
  automatizado.
- **Escenario 2** (US1 — ver y alternar el espectro, FR-002/003/004): `SpectrumChart.test.tsx`
  + `MainPage.test.tsx` ("activar 'Espectro' muestra el gráfico de espectro...",
  "desactivar 'Espectro' vuelve a mostrar el trazado"). ✅ automatizado.
- **Escenario 3** (recalculo automático al filtrar, FR-005): `MainPage.test.tsx` ("con
  'Espectro' activo, aplicar un filtro recalcula el espectro solo"), con `applyFilter` y
  `computeSpectrum` mockeados — verifica 2 llamadas a `computeSpectrum` (activar + tras
  filtrar). ✅ automatizado.
- **Escenario 4** (complejos y herramientas mientras se ve el espectro, FR-006/007):
  `MainPage.test.tsx` ("con 'Detec. Complejos' y 'Espectro' activos a la vez, no aparece
  el trazado ni sus marcas") — al no montarse `ECGChart` mientras `spectrumOn` (research.md
  D3), ninguna herramienta de interacción ni marca puede aparecer; esto es una consecuencia
  estructural del diseño, no algo que dependa de deshabilitar cada handler por separado. ✅
  automatizado (a nivel de composición de componentes).
- **Escenario 5** (ventana insuficiente, FR-009): cubierto en dos niveles —
  `PowerSpectrumTests.HasEnoughSamples_exige_un_minimo_de_muestras` (backend, DSP puro),
  `SpectrumEndpointTests.Spectrum_ventana_con_pocas_muestras_devuelve_400_insufficient_samples`
  (backend, endpoint) y `MainPage.test.tsx` ("ante una ventana insuficiente, muestra un
  aviso...", con `computeSpectrum` mockeado para rechazar). ✅ automatizado en las 3 capas.

## Hallazgo de la librería (FftSharp)

`FftSharp.FFT.FrequencyScale(n, fs, onesided: true)` devuelve un arreglo de longitud `n`
(no `n/2+1`) con la escala de frecuencia comprimida a `[0, fs/2]` — desalineado respecto de
`FFT.Magnitude(spectrum, true)`, que sí devuelve `n/2+1` bins reales. Usar ambos juntos con
el mismo índice produce una frecuencia equivocada (verificado empíricamente: para una
senoidal de 50 Hz, el pico se reportaba en ~25 Hz). Se evitó calculando la frecuencia de
cada bin manualmente (`i * fs / n`) en `PowerSpectrum.Compute`, documentado como comentario
en el código y en `research.md`.

## Pendiente

- Confirmación visual en Chrome/Firefox/Edge de: el espectro se ve razonable para una señal
  real (picos en las frecuencias esperadas del ECG y del ruido de red si lo hay), la
  transición entre trazado y espectro es instantánea, y ninguna herramienta de interacción
  responde visiblemente mientras se ve el espectro.
