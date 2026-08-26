# Data Model: Vista de espectro de potencia y limpieza de la sidebar

Todo lo descrito acá es estado **derivado y transitorio**: nunca se persiste con el
estudio (FR-010); se recalcula cada vez que la vista de espectro está activa, sobre la
ventana de tiempo visible.

## SpectrumPoint

Un punto del espectro de potencia.

| Campo | Tipo | Descripción |
|---|---|---|
| `frequency` | `number` (Hz) | Frecuencia del bin. |
| `power` | `number` | Potencia en esa frecuencia (unidad/escala exacta: decisión de implementación, research.md). |

## SpectrumResult

Resultado de una corrida de cálculo del espectro sobre la ventana visible.

| Campo | Tipo | Descripción |
|---|---|---|
| `points` | `SpectrumPoint[]` | Serie ordenada por frecuencia creciente, desde 0 Hz hasta `fs/2` (Nyquist). |

**Validación**: la señal de entrada (ventana visible) debe tener suficientes muestras
para un espectro con sentido (FR-009); si no las tiene, el backend responde con el
error `InsufficientSamples` en vez de un `SpectrumResult` vacío o engañoso.

## Ciclo de vida (en memoria, sin persistencia)

1. `idle` — "Espectro" desactivado; no hay `SpectrumResult` ni gráfico de espectro
   montado (se muestra `ECGChart` normalmente).
2. `busy` — el usuario activó "Espectro" (o cambió la señal/ventana con la herramienta
   ya activa); hay una llamada a `/api/spectrum` en curso.
3. `ready` — respuesta recibida; `SpectrumResult` disponible; `SpectrumChart` lo
   muestra.
4. `error` — la llamada falló (red, `InsufficientSamples`, etc.); se muestra un aviso
   (`role="alert"`) en vez del gráfico de espectro.

Al desactivar "Espectro", cambiar de estudio, o disparar una nueva corrida (señal o
ventana visible cambiadas), el resultado anterior se descarta.
