# ECGViewer — Backend

.NET 10 (Minimal API). Concentra el trabajo pesado y correcto por contrato: filtros DSP,
import/export XLSX y la persistencia del estudio único.

## Proyectos

- `ECGViewer.Api` — Minimal API (endpoints, DSP, Excel, persistencia).
- `ECGViewer.Tests` — xUnit (unitarios + integración con `WebApplicationFactory`).

## Comandos

```bash
dotnet restore
dotnet run --project ECGViewer.Api --urls http://localhost:5080
dotnet build -c Debug
dotnet test
```

## Dependencias NuGet

- `FftSharp` — filtros DSP (pasa bajo/alto/banda; notch = band-stop) — RF-10.
- `ClosedXML` — lectura/escritura de `.xlsx` — RF-12/13.
- `Microsoft.Data.Sqlite` (+ `SQLitePCLRaw.bundle_e_sqlite3`) — persistencia del estudio único.

## Endpoints (ver `specs/001-ecg-viewer/contracts/api.md`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/api/filter` | Aplica un filtro DSP (no destructivo) |
| POST | `/api/export/xlsx` | Exporta la señal a `.xlsx` (binario) |
| POST | `/api/import/xlsx` | Importa una señal desde `.xlsx` (multipart) |
| GET | `/api/study` | Restaura el estudio guardado (404 si no hay) |
| PUT | `/api/study` | Guarda (reemplaza) el estudio único |

Errores con formato uniforme `{ "error": { "code", "message" } }`. CORS habilita `5173`/`4173`.
La ruta de la base SQLite es configurable con la clave `StudyDbPath` (los tests la aíslan).

## Filtros DSP y longitud potencia de 2

`FftSharp.Filter.*` usa una FFT **radix-2** que exige que la señal tenga una longitud potencia de
2 y lanza `ArgumentException` en caso contrario. Las señales ECG reales no lo cumplen (los CSV de
ejemplo tienen 10000/10003 muestras), así que `SignalFilter.Apply` (`Dsp/SignalFilter.cs`):

1. extiende la señal hasta la siguiente potencia de 2 rellenando **por reflejo (espejo)**,
2. aplica el filtro de FftSharp sobre el arreglo extendido, y
3. recorta el resultado de vuelta a la longitud original.

El reflejo (en lugar de zero-pad) mantiene la señal continua en la costura y evita la pérdida de
amplitud que el escalón señal→0 produciría en la convolución circular del FFT. La cantidad de
muestras de salida siempre iguala a la de entrada; el detalle es transparente para el endpoint y
el frontend. Ver D4 en `specs/001-ecg-viewer/research.md`.
