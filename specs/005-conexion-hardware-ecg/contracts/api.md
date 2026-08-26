# API Contract — Conexión al hardware del ECG por puerto serie

Mismas convenciones que `specs/001-ecg-viewer/contracts/api.md` (base URL, CORS,
sin auth, error uniforme `{ "error": { "code", "message" } }`). Tres endpoints
nuevos, todos bajo `/api/serial`.

## GET /api/serial/ports — Puertos disponibles (FR-002)

**Response 200**

```jsonc
{ "ports": ["COM3", "COM4"] }   // puede ser [] si no hay ninguno
```

## POST /api/serial/connect — Abrir el puerto (FR-004)

**Request**

```jsonc
{ "port": "COM3", "baudRate": 115200 }
```

**Response 200**: `{}`. El stream de datos se consume aparte (`GET /api/serial/stream`).

**Errores**:
- `400 INVALID_SIGNAL`-style → `400 PORT_NOT_FOUND` si el puerto ya no está en
  la lista de disponibles.
- `409 ALREADY_CONNECTED` si ya hay una conexión activa (research.md D9: una
  sola a la vez).
- `500 PORT_UNAVAILABLE` si el sistema operativo no puede abrir el puerto
  (ocupado por otro programa, permisos, etc.).

## POST /api/serial/disconnect — Cerrar el puerto (FR-010)

**Response 200**: `{}` siempre que haya o no una conexión activa (idempotente).

## GET /api/serial/stream — Stream de muestras en vivo (FR-005/006/007, research.md D2)

`Content-Type: text/event-stream` (Server-Sent Events). Cada evento es un lote:

```jsonc
{
  "samples": [{ "t": 12.004, "v": 4.98 }, { "t": 12.008, "v": 5.01 }],
  "status": "connected",   // "connected" | "stopped" | "error"
  "reason": null           // "TIME_LIMIT" | "DEVICE_DISCONNECTED" | "PORT_ERROR" | null
}
```

- Se emite aproximadamente cada 100 ms mientras `status = "connected"`.
- El último evento de una sesión trae `status: "stopped"` (detención manual o
  límite de 20 min) o `status: "error"` (desconexión inesperada), con `reason`
  explicando por qué; después de ese evento el stream se cierra.
- Las muestras ya vienen escaladas a mV (D4) y con `t = n / 250` (D5); el
  cliente no hace ningún cálculo, solo las agrega a la señal en curso.

**Reglas**: ninguna línea inválida del puerto (FR-008) genera una muestra —
simplemente no aparece en ningún lote. Determinismo: dada la misma secuencia de
enteros por el puerto, el mismo resultado escalado (Principio I, unit-tested
con un puerto/fuente simulada en vez de hardware real).
