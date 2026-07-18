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


- **Caracterizacion espectral de la señal correcta y la analizada**: implementar 
  la caracterizacion de una señal correcta, y la señal a analizar.
  También crear un algoritmo/procedimiento para compararla y otro para sugerir cambios
  (auto-filter tal vez?). 
  Con esto bloquear señales que morfologicamente no coincidan con un ECG.


- **Archivos con casos de prueba**: generar archivos con casos de prueba, sobre
  todo para las **métricas de ventana** (BPM, SDNN, RMSSD, pNN50) y para la
  **detección de picos**.

- **Pipeline de CI**: crear un pipeline de integración continua (build y tests
  de back y front) que corra en cada push/PR.

- **Workflow de CD**: crear un workflow de entrega/despliegue continuo.
