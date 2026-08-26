# Data Model: Conexión al hardware del ECG por puerto serie

Todas las entidades de esta feature viven en el **frontend** (research.md D1):
el backend no participa de la conexión al hardware.

## SerialPortLike (`serial/webSerialTypes.ts`)

Superficie mínima de un puerto de la Web Serial API que usa la app —
interfaz propia (inyectable en tests) porque `lib.dom.d.ts` no incluye la Web
Serial API al ser no estándar.

| Campo/Método | Descripción |
|---|---|
| `open({ baudRate })` | Abre el puerto a la velocidad elegida. |
| `close()` | Cierra el puerto. |
| `readable` | `ReadableStream<Uint8Array>` con los bytes entrantes. |

## SerialConnectionConfig

Configuración elegida en el diálogo "Configuración". **No se persiste** con el
estudio (vive solo para la sesión del navegador, research.md D7).

| Campo | Tipo | Descripción |
|---|---|---|
| `port` | `SerialPortLike` | Puerto elegido con `navigator.serial.requestPort()` (selector nativo del navegador). |
| `baudRate` | `number` | Velocidad en baudios. Default **115200** (FR-003). |

## SerialConnectionStatus

Estado de la única conexión posible a la vez (`useSerialConnection`,
research.md D9).

| Estado | Descripción |
|---|---|
| `idle` | Sin conexión activa. |
| `connected` | Puerto abierto, recibiendo (o esperando) datos. |
| `stopped` | Se detuvo (manual o límite de 20 min) — el resultado ya quedó volcado a una señal normal. |
| `error` | Se perdió la conexión a mitad de captura (dispositivo desconectado). |

## Lote de muestras (estado del hook)

Lo que `useSerialConnection` vuelca a `samples` cada ~100 ms mientras lee el
puerto (research.md D2).

| Campo | Tipo | Descripción |
|---|---|---|
| `samples` | `Array<{ t: number; v: number }>` | Todas las muestras válidas acumuladas; `t` en segundos (`n / 250`, D5), `v` en mV ya escalado (D4). |
| `status` | `SerialConnectionStatus` | Estado actual de la conexión. |
| `reason` | `string \| null` | Motivo si `status` es `stopped`/`error` (`"TIME_LIMIT"` \| `"DEVICE_DISCONNECTED"` \| `null`). |

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
