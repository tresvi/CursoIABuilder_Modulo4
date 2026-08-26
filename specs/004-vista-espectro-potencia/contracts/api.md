# API Contract — POST /api/spectrum

Único endpoint nuevo de esta feature. Mismas convenciones que `specs/001-ecg-viewer/
contracts/api.md` (base URL, CORS, sin auth, `application/json`, formato de error
uniforme `{ "error": { "code", "message" } }`).

## POST /api/spectrum — Espectro de potencia de una señal (FR-003)

Calcula el espectro de potencia (FftSharp) de la señal recibida. El cliente envía las
muestras de la **ventana de tiempo visible** (research.md D2), no la señal completa; el
backend no sabe ni le importa qué ventana es, solo recibe una `Signal` y la transforma.

**Request**

```jsonc
{ "signal": Signal }   // mismo tipo Signal que /api/filter: { samples: [{t,v}], fs? }
```

**Response 200**

```jsonc
{
  "spectrum": {
    "points": [
      { "frequency": 0.0, "power": 0.0012 },
      { "frequency": 0.9765625, "power": 0.0034 }
      // ... ordenados por frecuencia creciente, hasta fs/2 (Nyquist)
    ]
  }
}
```

**Errores**:
- `400 INVALID_SIGNAL` — señal vacía (mismo código que `/api/filter`).
- `400 INSUFFICIENT_SAMPLES` — la ventana tiene muy pocas muestras para un espectro con
  sentido (FR-009). Umbral mínimo: decisión de implementación (documentar en el código
  junto a `SignalFilter.Validate`, que ya tiene validaciones análogas).

**Reglas**: no modifica el request; determinista para la misma entrada; unit-tested en
xUnit contra señales sintéticas de contenido espectral conocido (p. ej. una senoidal
pura debe concentrar su potencia cerca de su frecuencia) — Principio I.
