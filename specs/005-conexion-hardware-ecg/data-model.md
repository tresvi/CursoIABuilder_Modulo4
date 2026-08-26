# Data Model: Conexión al hardware del ECG por puerto serie

## SerialPortInfo

Un puerto serie disponible en la computadora (backend, solo lectura).

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre/identificador del puerto (p. ej. `COM3`, `/dev/ttyUSB0`). |

## ConnectionConfig

Configuración elegida en el diálogo "Configuración". **No se persiste** con el
estudio (vive solo para la sesión del navegador, research.md D7).

| Campo | Tipo | Descripción |
|---|---|---|
| `port` | `string` | Puerto elegido (de `SerialPortInfo`). |
| `baudRate` | `number` | Velocidad en baudios. Default **115200** (FR-003). |

## CaptureStatus

Estado de la única conexión posible a la vez (backend, `SerialCaptureService`
singleton — research.md D9).

| Estado | Descripción |
|---|---|
| `idle` | Sin conexión activa. |
| `connected` | Puerto abierto, recibiendo (o esperando) datos. |
| `stopped` | Se detuvo (manual, límite de 20 min, o error) — el resultado ya quedó volcado a una señal normal en el frontend. |
| `error` | El puerto no se pudo abrir, o se perdió la conexión a mitad de captura. |

## Lote de muestras (evento del stream)

Lo que el backend empuja por `GET /api/serial/stream` cada ~100 ms
(research.md D2).

| Campo | Tipo | Descripción |
|---|---|---|
| `samples` | `Array<{ t: number; v: number }>` | Muestras nuevas desde el último lote; `t` en segundos (`n / 250`, D5), `v` en mV ya escalado (D4). |
| `status` | `CaptureStatus` | Estado tras procesar este lote. |
| `reason` | `string \| null` | Motivo si `status` es `stopped`/`error` (p. ej. `"TIME_LIMIT"`, `"DEVICE_DISCONNECTED"`, `"PORT_ERROR"`). |

**Validación**: una línea recibida que no se pueda interpretar como entero se
descarta (FR-008) y no cuenta para el índice de muestra `n` ni para el límite
de 300 000 (D6).

## Relación con el modelo de señal existente

Una vez que la captura arranca, las muestras recibidas se acumulan exactamente
como el arreglo `samples` de una `Signal` ya existente en la app (mismo tipo
`{t, v}[]`, `fs = 250`) — no es una entidad nueva de dominio, es una fuente de
datos nueva para el mismo modelo (research.md D7). Al detener la conexión, el
resultado es una `Signal`/`Derivation` común, sin ninguna marca especial de
"vino de hardware" a nivel de datos (aunque sí puede haber, a nivel de UI,
alguna indicación de que la sesión activa vino de una conexión).
