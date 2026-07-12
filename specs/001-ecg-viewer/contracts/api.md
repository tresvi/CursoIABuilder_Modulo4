# API Contracts — ECGViewer Backend (.NET 10 Minimal API)

Base URL (dev): `http://localhost:5080`. CORS habilitado para `http://localhost:5173` y `:4173`.
Sin autenticación (libre acceso, FR-020). Content-Type `application/json` salvo donde se indique
(multipart / binario para XLSX).

El backend concentra: **filtros DSP** (RF-10), **import/export XLSX** (RF-12/13) y la
**persistencia del estudio único** (RF-15/21). El parseo de CSV y el cálculo de métricas viven
en el frontend (ver `research.md` D2/D5).

## Tipos comunes

```jsonc
// Signal
{
  "samples": [ { "t": 0.0, "v": 0.12 }, { "t": 0.004, "v": 0.15 } ], // t[s], v[mV], orden creciente
  "fs": 250.0        // Hz (opcional en request; el backend puede derivarla)
}

// FilterConfig
{
  // Filtros FFT (dominio de frecuencia):     "lowpass" | "highpass" | "bandpass" | "notch"
  // Filtros de tiempo (ventana deslizante):  "movingaverage" | "median" | "savgol"
  "type": "bandpass",
  "cutoffLow": 1.0,     // Hz — requerido en highpass/bandpass/notch
  "cutoffHigh": 49.5,   // Hz — requerido en lowpass/bandpass/notch
  "window": null,       // muestras — requerido en movingaverage/median/savgol
  "polyOrder": null     // grado del polinomio — requerido solo en savgol
}

// Error (uniforme)
{ "error": { "code": "INVALID_SIGNAL", "message": "..." } }
```

Códigos de error: `INVALID_SIGNAL`, `MULTICHANNEL_NOT_SUPPORTED`, `INVALID_XLSX`,
`INVALID_FILTER_PARAMS`, `NOT_FOUND`.

---

## POST /api/filter — Aplicar filtro digital (RF-10, AC-14)

Aplica un filtro DSP de forma **no destructiva**: recibe la señal y devuelve una nueva
serie filtrada. El original lo conserva el cliente para revertir (RF-11). Hay dos familias:
los filtros de frecuencia (FftSharp: `lowpass`/`highpass`/`bandpass`/`notch`) y los filtros de
tiempo por ventana deslizante (`movingaverage`/`median`/`savgol`), estos últimos pensados para
suavizar conservando mejor los picos (ver `docs/Analisis de Filtros.md`).

**Request**
```jsonc
{ "signal": Signal, "filter": FilterConfig }
```

**Response 200**
```jsonc
{ "signal": Signal }   // muestras filtradas, mismo eje temporal
```

**Errores**: `400 INVALID_FILTER_PARAMS`:
- Filtros de frecuencia: cutoffs faltantes/incoherentes (p. ej. bandpass con
  `cutoffLow >= cutoffHigh`) o corte ≥ Nyquist = fs/2.
- `movingaverage`: `window` ausente o < 2 muestras.
- `median` / `savgol`: `window` no impar o < 3 muestras; en `savgol`, además,
  `polyOrder` fuera de `[1, window − 1]`.

También `400 INVALID_SIGNAL` (vacía).

**Reglas**: no modifica el request; determinista para misma entrada; unit-tested en xUnit contra
señales sintéticas de respuesta conocida (Principio I).

---

## POST /api/import/xlsx — Importar señal desde Excel (RF-13, AC-17)

**Request**: `multipart/form-data` con campo `file` (`.xlsx`).

**Response 200**
```jsonc
{ "signal": Signal }   // parseada, misma validación que CSV
```

**Errores**:
- `400 INVALID_XLSX` — estructura inesperada (sin columnas tiempo/valor, no numérico, vacío/solo
  encabezado).
- `422 MULTICHANNEL_NOT_SUPPORTED` — más de un canal (informar, no procesar) (AC-03 análogo).

---

## POST /api/export/xlsx — Exportar señal a Excel (RF-12, AC-16)

**Request**
```jsonc
{ "signal": Signal }
```

**Response 200**: binario `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
(`Content-Disposition: attachment; filename="ecg.xlsx"`). Encabezado tiempo/valor + filas de
muestras; reimportable sin pérdida perceptible (SC-006).

**Errores**: `400 INVALID_SIGNAL`.

---

## GET /api/study — Restaurar el estudio guardado (RF-21)

**Response 200**
```jsonc
{
  "signal": Signal,               // señal ORIGINAL guardada
  "markers": [ { "id": "m1", "time": 3.2, "label": "artefacto" } ],
  "filter": FilterConfig | null,
  "crop": { "fromTime": 1.0, "toTime": 30.0 } | null,
  "savedAt": "2026-07-11T10:00:00Z"
}
```

**Response 404 `NOT_FOUND`**: aún no hay ningún estudio guardado.

El cliente reconstruye `workingSignal` re-aplicando `filter`/`crop` sobre la señal original.

---

## PUT /api/study — Guardar (reemplazar) el estudio (RF-15/16/21, AC-20)

Único punto de persistencia. Upsert: **reemplaza** el estudio anterior (un solo estudio, FR-021).
Se invoca **solo** al presionar "Guardar" (Principio III; nunca automático, FR-017).

**Request**
```jsonc
{
  "signal": Signal,                // señal original a persistir
  "markers": EventMarker[],
  "filter": FilterConfig | null,
  "crop": { "fromTime": number, "toTime": number } | null
}
```

**Response 200**
```jsonc
{ "savedAt": "2026-07-11T10:00:00Z" }
```

**Errores**: `400 INVALID_SIGNAL`.

**Nota de alcance**: NO existen endpoints de lista ni de comparación de estudios (FR-021 fuera de
alcance). NO hay `DELETE` requerido por el spec.

---

## Endpoints que NO existen (por alcance)

- Sin `/api/metrics` ni `/api/parse-csv`: métricas y CSV se resuelven en el frontend
  (`research.md` D2/D5).
- Sin autenticación / usuarios / sesiones (FR-020).
