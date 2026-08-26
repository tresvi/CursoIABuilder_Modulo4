# Pendientes

Trabajo futuro identificado para el ECGViewer.

- ~~**Detección automática de complejos**~~ — resuelto por
  [`specs/003-deteccion-complejos-pqrst`](../specs/003-deteccion-complejos-pqrst/spec.md):
  "Detec. Complejos" en la sidebar marca los 5 puntos (P, Q, R, S, T) de cada latido sobre toda
  la señal cargada. Sigue pendiente, como trabajo aparte: exponer la **duración** de cada complejo
  como métrica (se puede derivar de los puntos ya detectados) y la idealización del trazado.

- **Funcion de comparar segmentos de ECG**: desarrollar la funcionalidad para   comparar dos segmentos (o tal vez N segmentos) en simultaneo. La comparacion consistirá en varios charts apilados donde se visualizaria el mismo grafico pero en distintos puntos para realizar la comparacion. De paso al costado cada uno tendrá sus propias metricas de segmento

- **Filtros de `Analisis de Filtros.md`**: implementar lo descrito en
  [`Analisis de Filtros.md`](Analisis%20de%20Filtros.md), en particular el
  backlog: filtrado automático inteligente (basado en una tasa de variabilidad)
  y el filtro de "idealización" (redibujar los complejos ya detectados sobre una
  línea ideal, tipo ECG de manual — la detección automática en sí ya está resuelta,
  ver ítem de arriba).

- **Deteccion de señal ECG**: implementar una funcionalidad para decidir si la señal 
  realmente es un ECG. A priori podria ser un pipeline de deciciones:
  Paso 1) Ejecutar un Pan-Tomkins con umbrales adaptativos y verificar si el heart rate está entre 40 y 200 bpm. 
  Fuera de ese rango no es razonable. Podria entregarse una porcentaje de probabilidad a la siguiente etapa
  Lo bueno que este metodo ya filtra entre 5 y15 Hz ,si bien no sera el dfinitivo, sirve de criterio de aceptacion
  Paso 2)Aplica Z-Score a la señal para eliminar el DC y normalizarla, luego tomar el espectro entre 5 y 25Hz (suma al cuadrado de todos los bins que caen en esa banda, dividida por alguna referencia, normalmente la suma de la energia total en la banda es decir E_total =  |X_k|**2 e toda la bnda de 0,5 a 49.5)
  rQRS​=E[5,25]​​/E_total  En donde rQRS me dice que fraccion de toda la señal esta concentrada en esa banda, que es la banda del QRS. Da entre 0 y 1
  Este criterio me protege contra:
  - Una senoidal pura a, digamos, 10 Hz mete casi toda su energía en un bin dentro de la banda → ratio cercano a 1. Demasiado concentrado: delata que no es un ECG.
  - Ruido blanco reparte energía plana en todo el espectro → la fracción que cae en 5–25 Hz es más o menos proporcional al ancho de esa banda respecto del total, un valor bajo y "sin carácter".

  Paso 3) Se podria sacar este valor por cada frecuencia resultante de mi FFT (digamos de 0.5 a 49.5 Hz), normalizar con Z-Score y aplicar la similitud del coseno entre los vectores de la señal patron y la señal a revisar
  La similitud del coseno desestima el tamaño y se centra en el angulo. Dará u valor entre -1 y 1. Establecer un umbral

  Pensar que tambien el analisis se podria repetir para varias bandas:
  - Muy baja, ~0.5–5 Hz: ondas P y T, y algo de la base del QRS. Si acá hay demasiada energía, huele a deriva de línea de base.
  - Media, ~5–15 Hz: el grueso del QRS.
  - Alta, ~15–40 Hz: los flancos empinados del QRS y detalle rápido. Si hay muchísima acá, huele a ruido muscular o de red.
  y Crear un vector y luego usar similityud del coseno nuevamente

  Ver el espectro, tal vez sea mejor recortar entre 2-25Hz

- **Caracterizacion espectral de la señal correcta y la analizada**: implementar 
  la caracterizacion de una señal correcta, y la señal a analizar.
  También crear un algoritmo/procedimiento para compararla y otro para sugerir cambios
  (auto-filter tal vez?). 
  Con esto bloquear señales que morfologicamente no coincidan con un ECG.


- **Archivos con casos de prueba**: generar archivos con casos de prueba, sobre
  todo para las **métricas de ventana** (BPM, SDNN, RMSSD, pNN50) y para la
  **detección de picos**.

- **Workflow de CD**: crear un workflow de entrega/despliegue continuo.
  El CI ya vive en [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
