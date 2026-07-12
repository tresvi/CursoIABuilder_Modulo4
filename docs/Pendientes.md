# Pendientes

Trabajo futuro identificado para el ECGViewer.

- **Detección automática de complejos**: desarrollar la detección automática de
  los complejos del ECG (picos de los complejos y sus duraciones). Es la base
  para la idealización del trazado y para métricas más ricas.

- **Filtros de `Analisis de Filtros.md`**: implementar lo descrito en
  [`Analisis de Filtros.md`](Analisis%20de%20Filtros.md), en particular el
  backlog: filtrado automático inteligente (basado en una tasa de variabilidad),
  el filtro de "idealización" (detectar complejos y redibujarlos sobre una línea
  ideal, tipo ECG de manual) y la detección automática de complejos.

- **Archivos con casos de prueba**: generar archivos con casos de prueba, sobre
  todo para las **métricas de ventana** (BPM, SDNN, RMSSD, pNN50) y para la
  **detección de picos**.
