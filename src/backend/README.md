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
