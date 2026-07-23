# ECGViewer

Aplicación web para **visualizar, filtrar y analizar** señales de electrocardiograma (ECG)
desde archivos CSV/XLSX. Orientada a entornos educativos y de investigación en ingeniería
biomédica. App de **libre acceso** (sin usuarios ni sesiones).

> ECGViewer **no es una herramienta de diagnóstico clínico certificado**.

## Arquitectura

| Capa | Stack | Ubicación | Responsabilidad |
|------|-------|-----------|-----------------|
| Frontend | React 19.2 + TypeScript 5.7 (Vite 6) · Tailwind CSS v4 + shadcn/ui | `src/frontend` | Cascarón dashboard (sidebar colapsable, tarjetas de métricas, barra de estado), carga CSV, render (Canvas doble capa), métricas HRV sobre la ventana visible, zoom/regla/recorte/marcadores |
| Backend | .NET 10 (Minimal API) | `src/backend` | Filtros DSP (FftSharp), import/export XLSX (ClosedXML), persistencia del estudio único (SQLite) |

- API: `http://localhost:5080` · Front dev: `http://localhost:5173` (CORS ya habilitado).
- El front consume la API vía `VITE_API_BASE` (por defecto `http://localhost:5080`).
- Responsividad: **tablet + PC** (mobile fuera de alcance). El gráfico ECG es Canvas 2D propio,
  no una librería de charting.

Diseño detallado en `specs/`:
- [`001-ecg-viewer/`](specs/001-ecg-viewer/) — funcionalidad base: `spec.md`, `plan.md`,
  `data-model.md`, `contracts/api.md`, `research.md`, `quickstart.md`, `tasks.md`.
- [`002-ui-shell-redesign/`](specs/002-ui-shell-redesign/) — rediseño del cascarón de UI
  (dashboard con sidebar, shadcn/ui + Tailwind).

## Requisitos

- **.NET 10 SDK** y **Node 20+** (con `npm`).

## Cómo correr

Backend (terminal 1):

```bash
cd src/backend
dotnet restore
dotnet run --project ECGViewer.Api   # → http://localhost:5080
```

Frontend (terminal 2):

```bash
cd src/frontend
npm install
npm run dev                           # → http://localhost:5173
```

Abrir `http://localhost:5173`.

## Tests y calidad

```bash
# Backend (xUnit): DSP, XLSX, persistencia + endpoints
cd src/backend && dotnet test

# Frontend (Vitest): parseo, métricas, interacción, componentes + benchmarks
cd src/frontend && npm test

# Frontend: typecheck, lint y formato
cd src/frontend && npm run typecheck && npm run lint && npm run format:check
```

## Funcionalidades (historias de usuario)

- **US1** Cargar y visualizar CSV monocanal (rechaza inválido/multicanal), con rejilla tipo
  papel milimetrado clínico (10 mm/mV; velocidad de papel 25/50 mm/s) conmutable.
- **US2** Métricas HRV (BPM, SDNN, RMSSD, pNN50) **sobre la ventana visible**; "—" si faltan latidos.
- **US3** Zoom por arrastre + "Restablecer zoom".
- **US4** Filtros digitales (pasa bajo/alto/banda/notch) reversibles.
- **US5** Regla (Δt/Δamp) y recorte con confirmación previa.
- **US6** Marcadores de evento (crear/editar/eliminar).
- **US7** Import/Export XLSX.
- **US8** Guardado explícito (un único estudio) + alerta ante cambios sin guardar.

## Principios (constitución)

Señal original inmutable · persistencia solo por "Guardar" · métricas sobre la ventana
visible · render de alto rendimiento (Canvas doble capa) · TDD. Ver
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).
