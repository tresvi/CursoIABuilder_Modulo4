# ECGViewer
Aplicación web para visualizar, filtrar y analizar señales de electrocardiograma (ECG) desde archivos CSV.
Orientada a entornos educativos y de investigación en ingeniería biomédica.

## Stack
- Front: React 19.2 + TypeScript 5.x (Vite). Ubicado en `src/frontend`.
- Back: .NET 10 (Minimal API). Ubicado en `src/backend`.
- Base de datos: SQLite (para persistir los estudios guardados). App de libre acceso: sin usuarios ni sesiones.

### Dependencias NuGet (back)
Versiones exactas viven en el `.csproj`; acá solo el "qué y por qué".
- `FftSharp` (Scott Harden): cálculos de filtros DSP (pasa bajo/alto/banda/notch) — RF-10.
- `ClosedXML` y `DocumentFormat.OpenXml`: manipulación y creación de archivos Excel `.xlsx` (import/export) — RF-12, RF-13.

## Cómo correr
Estructura: en la raíz hay una carpeta `src` con `src/frontend` (frontend) y `src/backend` (backend).

Requisitos: **.NET 10 SDK** y **Node 20+** (con `npm`).

Puertos (ya alineados, no hace falta configurar nada): la API escucha en `http://localhost:5080`
y el front de desarrollo en `http://localhost:5173`. El front consume la API vía `VITE_API_BASE`
(por defecto `http://localhost:5080`) y el CORS del back ya habilita `5173`/`4173`.

Backend — carpeta `src/backend` (solución con dos proyectos: `ECGViewer.Api` y `ECGViewer.Tests`):
- Instalar dependencias: `dotnet restore`
- Ejecutar la API: `dotnet run --project ECGViewer.Api`  → queda en `http://localhost:5080`
- Compilar todo: `dotnet build -c Debug`
- Tests (xUnit): `dotnet test`

Frontend — carpeta `src/frontend`:
- Instalar dependencias: `npm install`
- Desarrollo: `npm run dev`  → `http://localhost:5173`
- Build de producción: `npm run build`
- Tests unitarios (Vitest): `npm test`
- Tests E2E (Playwright, si se agregan): `npx playwright test`

Flujo mínimo para levantar la app: en una terminal `cd src/backend && dotnet run --project ECGViewer.Api`,
en otra `cd src/frontend && npm install && npm run dev`, y abrir `http://localhost:5173`.

## Qué NO hacer
- NO persistir cambios automáticamente: marcadores, filtros y recortes solo se guardan cuando el usuario presiona explícitamente "Guardar". Si hay cambios pendientes al cerrar o recargar, alertar y pedir confirmación.
- NO modificar destructivamente la señal original: los filtros y recortes deben poder revertirse a la señal cargada.
- NO calcular las métricas (BPM, SDNN, RMSSD, pNN50) sobre todo el archivo: siempre sobre la ventana de tiempo visible.
- NO usar librerías gráficas que no cumplan el rendimiento exigido: render <0.1 s para 1 minuto de señal y sin parpadeos.
- NO asumir señales multicanal: la app soporta un solo canal; ante un CSV/XLSX multicanal, informar y no procesar.
- NO aplicar el recorte de inmediato: seleccionar con el mouse, mostrar un cartel de confirmación y recortar solo si el usuario acepta (RF-09, AC-13).
- NO agregar inicio de sesión ni datos por usuario: la app es de libre acceso (autenticación está Fuera de Alcance).
- NO hardcodear la API key de Claude: va en `.env` como ANTHROPIC_API_KEY.
- NO llamar a la API de Claude desde los tests: usar mocks/fakes.
- NO agregar features fuera del alcance definido: captura en tiempo real por hardware, multi-usuario/roles/nube, HL7/DICOM, export a firmware, multi-tenant.
- NO presentar ECGViewer como herramienta de diagnóstico clínico certificado.
