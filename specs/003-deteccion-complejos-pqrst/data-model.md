# Data Model: Detección y marcado de complejos PQRST

Todo lo descrito acá es estado **derivado y transitorio** en memoria del frontend
(FR-010): nunca se persiste con el estudio, se recalcula cada vez que la
herramienta está activa sobre la señal actualmente mostrada (original o filtrada).

## PqrstPoint

Un punto individual (P, Q, R, S o T) dentro de un complejo detectado.

| Campo | Tipo | Descripción |
|---|---|---|
| `kind` | `"P" \| "Q" \| "R" \| "S" \| "T"` | Qué punto del complejo representa. |
| `time` | `number` (s) | Instante sobre el eje temporal de la señal. |
| `amplitude` | `number` (mV) | Amplitud de la señal en ese instante (para ubicar el punto en Y al dibujarlo). |

**Validación**: `time` debe caer dentro del rango de la señal sobre la que se
detectó (`[0, durationSec]`).

## PqrstComplex

Un latido identificado (Key Entity del spec: "Complejo PQRST detectado").

| Campo | Tipo | Descripción |
|---|---|---|
| `rTime` | `number` (s) | Ancla del complejo: el tiempo del pico R (mismo valor que ya produce `detectRPeaks`). |
| `points` | `Partial<Record<"P"\|"Q"\|"R"\|"S"\|"T", PqrstPoint>>` | Puntos localizados para este latido. `R` siempre presente; `Q` y `S` se esperan presentes cuando `R` es válido; `P` y `T` pueden faltar (no se inventan) si no aparecen con contraste suficiente en su ventana de búsqueda (ver research.md D3). |

**Relación**: `PqrstComplex` no tiene relación con `EventMarker` (marcadores
manuales, `src/frontend/src/signal/markers.ts`); son modelos independientes que
conviven en pantalla (FR-011) pero no se cruzan ni se combinan.

## ComplexDetectionResult

Resultado completo de una corrida de detección sobre una señal (o intento de).

| Campo | Tipo | Descripción |
|---|---|---|
| `complexes` | `PqrstComplex[]` | Complejos detectados con confianza, en orden temporal. |
| `lowConfidenceRanges` | `Array<{ fromTime: number; toTime: number }>` | Tramos de la señal donde no se pudo detectar con confianza (US3/FR-008); vacío si toda la señal fue detectable. Si la señal completa no es reconocible, este arreglo cubre `[0, durationSec]` y `complexes` queda vacío. |

**Ciclo de vida** (no hay persistencia, solo estados en memoria mientras la
herramienta está activa):

1. `idle` — "Detec. Complejos" desactivado; no hay `ComplexDetectionResult` ni
   marcas dibujadas.
2. `processing` — herramienta activada (o señal/filtro recién cambiados con la
   herramienta ya activa); el Worker (research.md D2) está calculando; el botón
   queda deshabilitado con el estado de carga (D6); no hay marcas dibujadas todavía.
3. `ready` — Worker terminó; `ComplexDetectionResult` disponible; se dibujan los
   puntos de `complexes` sobre la ventana visible y, si `lowConfidenceRanges` no
   está vacío, se muestra el aviso (D7) para esos tramos (o para toda la señal si
   `complexes` quedó vacío).

Al desactivar la herramienta, cambiar de estudio, o iniciar un nuevo cálculo
(filtro aplicado/cambiado/restaurado), el resultado anterior se descarta y se
vuelve a `idle` o `processing` según corresponda — nunca se muestran marcas de una
señal que ya no es la que está en pantalla.
