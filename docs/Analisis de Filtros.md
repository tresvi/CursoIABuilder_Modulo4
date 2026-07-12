# Análisis de Filtros

Notas sobre filtros de suavizado que **respetan los picos** de la señal, como
alternativa a la media móvil.

## El problema de la media móvil

La media móvil es un pasa-bajo "tonto": promedia por igual todas las muestras de
la ventana, así que un pico angosto y alto se reparte entre sus vecinos y **baja
de amplitud**. En ECG esto es crítico, porque aplastar el pico R falsearía la
medición de BPM.

Las alternativas atacan ese problema de distintas formas.

## 1. Filtro de mediana (*median filter*) — el más directo

- En vez de **promediar** la ventana, toma la **mediana**.
- Un pico o *spike* aislado no arrastra la mediana, así que **preserva bordes y
  escalones** y elimina ruido impulsivo (artefactos, picos espurios).
- En ECG es el clásico para **quitar la deriva de línea base** (*baseline
  wander*): una mediana con ventana grande estima la línea base y se la restás.
- Contra: no es lineal y, con ventanas grandes, puede aplanar zonas suaves de
  forma escalonada.

## 2. Savitzky–Golay — el que mejor conserva la forma del pico

- Ajusta un **polinomio de bajo grado por mínimos cuadrados** dentro de una
  ventana deslizante, en lugar de promediar.
- Como el polinomio puede "curvar", **conserva la altura y el ancho de los
  picos** mucho mejor que la media móvil, suavizando el ruido de fondo.
- Es el estándar en espectroscopía y muy usado en ECG/procesamiento de picos
  justamente por esta propiedad.
- Es un **FIR** (coeficientes fijos precalculados según grado y tamaño de
  ventana), así que es barato y lineal.

## 3. Otras opciones según el caso

- **Filtro bilateral**: promedia solo muestras que además de estar cerca en el
  tiempo están cerca en amplitud → no cruza los bordes. Preserva picos, pero es
  más caro y menos habitual en 1D.
- **TV denoising (variación total)**: suaviza zonas planas y mantiene los saltos
  abruptos. Bueno para señales "por tramos".
- **Denoising por wavelets**: descompone la señal, umbraliza los coeficientes de
  ruido y reconstruye. Muy usado en ECG porque separa bien el complejo QRS del
  ruido.

## Recomendación para ECGViewer

| Objetivo                                    | Filtro recomendado                    |
| ------------------------------------------- | ------------------------------------- |
| Suavizar ruido **sin achatar el pico R**    | **Savitzky–Golay**                    |
| Quitar **deriva de línea base**             | **Mediana** de ventana grande (restar)|
| Quitar **spikes/artefactos** puntuales      | **Mediana** de ventana chica          |

En resumen: el "primo" de la media móvil que respeta los picos es, según el uso,
la **mediana móvil** (contra impulsos y línea base) o el **Savitzky–Golay** (para
suavizar conservando la forma del pico). Los dos son FIR, salvo la mediana, que
es no lineal.

## Implementación en la app

Los tres filtros de tiempo están disponibles en el panel **Filtro digital**, junto
a los de frecuencia basados en `FftSharp`. Operan de forma **no destructiva**
(se pueden revertir a la señal cargada) y comparten el mismo endpoint
`POST /api/filter` (ver `specs/001-ecg-viewer/contracts/api.md`).

Todos son de **ventana deslizante centrada**; los bordes se resuelven reflejando
la señal (reflect-101), así que la salida conserva la misma longitud y no aparecen
escalones artificiales en los extremos.

| Filtro          | `type`          | Parámetros                     | Ventana por defecto |
| --------------- | --------------- | ------------------------------ | ------------------- |
| Media móvil     | `movingaverage` | `window` ≥ 2                   | 5                   |
| Mediana móvil   | `median`        | `window` impar ≥ 3             | 7                   |
| Savitzky–Golay  | `savgol`        | `window` impar ≥ 3, `polyOrder` ∈ [1, window−1] | 11 (grado 3) |

- **Media móvil** y **mediana** exponen solo el tamaño de ventana; Savitzky–Golay
  agrega el **grado del polinomio**.
- La mediana y Savitzky–Golay exigen **ventana impar** para poder centrarla.
- El filtro por defecto del panel es **pasa banda 1–49.5 Hz** (banda diagnóstica
  típica de ECG); los filtros de tiempo se eligen manualmente para experimentar.

### Nota de implementación (Savitzky–Golay)

Los coeficientes se calculan por mínimos cuadrados: se arma la matriz normal
`AᵀA` (con `A[i][c] = zᵢ^c`, `z ∈ [-m, m]`) y se resuelve `AᵀA·s = e₀` por
eliminación gaussiana; el peso de cada muestra es `wⱼ = Σ_c s[c]·zⱼ^c`. Como
verificación, para ventana 5 y grado 2 los coeficientes resultan exactamente
`[-3, 12, 17, 12, -3] / 35`, el kernel cuadrático de 5 puntos de manual.

## Ideas a explorar (backlog)

Líneas de trabajo futuras, todavía sin implementar:

- **Filtrado automático inteligente**: explorar una función que elija/ajuste el
  filtro automáticamente en base a alguna **tasa de variabilidad** de la señal
  (p. ej. medir ruido/varianza local y decidir tipo y parámetros del filtro).
- **Filtro de "idealización"**: explorar un filtro que **detecte los complejos**
  y los redibuje sobre una **línea ideal**, marcando los picos de cada complejo y
  sus duraciones, produciendo un trazado tipo "ECG de manual".
- **Detección automática de complejos**: seguir trabajando en la detección
  automática de complejos (base necesaria para la idealización y para métricas
  más ricas).
