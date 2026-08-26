# ECGViewer
Aplicación web para visualizar, filtrar y analizar señales de electrocardiograma (ECG) desde archivos CSV.
Orientada a entornos educativos y de investigación en ingeniería biomédica.

## Stack
- Front: React 19.2 + TypeScript 5.x (Vite). Ubicado en `src/frontend`.
- Back: .NET 10 (Minimal API). Ubicado en `src/backend`.
- Base de datos: SQLite (para persistir los estudios guardados). App de libre acceso: sin usuarios ni sesiones.

### UI (front) — feature 002
- **shadcn/ui + Tailwind CSS v4**. Primitivos propios en `src/frontend/src/components/ui/` (`button`,
  `card`, `badge`, `input`, `select`); tokens de tema (sidebar navy, acento teal) en
  `src/frontend/src/index.css`; helper `cn` en `src/frontend/src/lib/utils.ts`. Alias `@/*` → `src/*`.
- **Cascarón** en `src/frontend/src/components/layout/`: `AppLayout` (sidebar · contenido · footer),
  `Sidebar` (colapsable con hamburguesa + secciones colapsables), `NavItem`, `TopBar`, `StatusBar`.
- El **gráfico ECG sigue siendo Canvas 2D propio** (`components/ECGChart.tsx` + `render/*`); es
  responsivo al contenedor vía `ResizeObserver`. NO reemplazar por librería de charting (Principio V).
- `select`/`input` son **nativos estilados** (no Radix) para preservar `aria-label` y los tests.
- Alcance de responsividad: **tablet + PC**; mobile fuera de alcance. Ver `specs/002-ui-shell-redesign/`.

### Detección de complejos PQRST — feature 003
- La sección de la sidebar antes llamada "Filtros" es ahora **"Diagnósticos"** (mismo
  `Sidebar.tsx`); "Detec. Complejos" es su primer ítem.
- Motor en `src/frontend/src/metrics/complexDetection.ts`; dibujo del overlay en
  `src/frontend/src/render/drawComplexMarks.ts`.
- **Patrón reutilizable**: el cómputo pesado corre en un Web Worker
  (`src/frontend/src/workers/complexDetection.worker.ts`) con fallback inline síncrono cuando
  `Worker` no existe (jsdom, entornos restringidos) — ver `src/frontend/src/hooks/useComplexDetection.ts`.
  Repetir este patrón ante futuro trabajo pesado en el frontend.

### Espectro de potencia y sidebar sin atajos de filtro — feature 004
- "Diagnósticos" quedó con **"Detec. Complejos" y "Espectro"** únicamente: los atajos de
  filtro (Pasa Bajo/Alto/Banda/Notch) y "Restaurar" se sacaron de la sidebar. Filtrar
  sigue funcionando igual desde `FilterPanel` (debajo del gráfico), que ya tenía su
  propio selector de tipo y sus propios botones.
- "Espectro" alterna el gráfico principal entre `ECGChart` (trazado) y
  `src/frontend/src/components/SpectrumChart.tsx` (espectro de potencia) — son
  componentes separados, no un "modo" de `ECGChart` (así ninguna herramienta de
  interacción ni marca de complejos aplica mientras se ve el espectro, gratis).
- El cálculo corre en el backend: nuevo endpoint `POST /api/spectrum`
  (`src/backend/ECGViewer.Api/Endpoints/SpectrumEndpoints.cs` +
  `Dsp/PowerSpectrum.cs`, reutiliza `FftSharp`), sobre la ventana visible (no toda la
  señal). Ver `specs/004-vista-espectro-potencia/` para el detalle.
- **Cuidado con `FftSharp.FFT.FrequencyScale(n, fs, onesided: true)`**: devuelve un
  arreglo de longitud `n` (no `n/2+1`) con la escala comprimida — desalineado con
  `FFT.Magnitude(..., true)`. `PowerSpectrum.Compute` calcula la frecuencia de cada bin
  a mano (`i * fs / n`) en vez de usarlo.
- Requisitos y comportamiento detallado: `specs/003-deteccion-complejos-pqrst/`.

### Conexión al hardware del ECG por puerto serie — feature 005
- Nueva sección en la sidebar, **"Conectarse"** (junto a "Herramientas"/"Diagnósticos"):
  "Configuración" (elegir dispositivo y baudios) y "Conectarse"/"Desconectarse".
- **Todo vive en el frontend, el backend no participa**: corre en un contenedor, sin
  acceso al puerto físico de quien usa la app. El puerto se abre con la **Web Serial
  API** del navegador (`navigator.serial`, solo Chrome/Edge/Opera, requiere HTTPS o
  `localhost`) — no existe ningún `/api/serial/*` ni código de `System.IO.Ports`.
- `src/frontend/src/serial/webSerialTypes.ts`: interfaz propia (`SerialPortLike`/
  `NavigatorSerialLike`) inyectable en tests, igual que el Worker inyectable de la
  feature 003 (`navigator.serial` no existe en jsdom).
- `src/frontend/src/hooks/useSerialConnection.ts`: abre el puerto, lee su
  `ReadableStream`, escala cada línea a mV (`signal/sampleScaling.ts`) y numera las
  muestras a 250 Hz, volcándolas al estado en lotes de ~100 ms.
- Mientras hay una conexión activa, `useVisibleWindow` entra en modo autoseguimiento
  (`autoFollow`): la ventana visible sigue el extremo más reciente de la señal.
- Requisitos y comportamiento detallado: `specs/005-conexion-hardware-ecg/`.

### Dependencias NuGet (back)
Versiones exactas viven en el `.csproj`; acá solo el "qué y por qué".
- `FftSharp` (Scott Harden): cálculos de filtros DSP (pasa bajo/alto/banda/notch) — RF-10;
  también el espectro de potencia (`Dsp/PowerSpectrum.cs`, feature 004).
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

## Flujo de Git (Trunk-Based Development, constitution v1.3.0)
- `main` es la **única rama de larga vida** y DEBE quedar siempre en verde/desplegable.
- **Todo cambio entra por Pull Request** desde una rama corta `NNN-<slug>` (numeración de
  Speckit; para un ajuste chico sin spec propia, alcanza un slug descriptivo con el próximo
  número libre). **El push directo a `main` está prohibido.**
- Ningún PR se mergea sin los dos checks de CI (`frontend` + `backend`) en verde.
- Al mergear (merge commit, no squash/rebase, para mantener el estilo ya usado en el repo),
  borrar la rama; sincronizar `main` local con `git pull` antes de arrancar la próxima rama.
- Ver `.specify/memory/constitution.md` (sección "Flujo de Desarrollo y Puertas de Calidad"
  y "Governance") para el detalle completo.

## CI
`.github/workflows/ci.yml` corre en cada push a `main`, en cada PR y a mano (`workflow_dispatch`),
con dos jobs paralelos:
- **frontend** (`src/frontend`, Node 22): `npm ci` → `npm run lint` → `npm test` → `npm run build`.
- **backend** (`src/backend`, .NET 10): `dotnet restore|build|test ECGViewer.slnx`.

La solución es **`ECGViewer.slnx`** (formato nuevo); no existe ningún `.sln`.
No hay gates de formato: `dotnet format --verify-no-changes` y `npm run format:check` hoy fallan
sobre código ya mergeado, así que quedaron fuera del CI a propósito.

`.github/workflows/deploy.yml` es un workflow de **entrega manual** (`workflow_dispatch` con
checkboxes): empaquetar backend+frontend como zip y publicarlo en Releases, y/o deployar el
frontend a GitHub Pages. Nada corre solo; se dispara a mano desde la pestaña Actions.

## Qué NO hacer
- NO pushear directo a `main`: todo cambio entra por Pull Request desde una rama corta
  (Trunk-Based Development, constitution v1.3.0); ningún PR se mergea sin CI en verde.
- NO persistir cambios automáticamente: marcadores, filtros y recortes solo se guardan cuando el usuario presiona explícitamente "Guardar". Si hay cambios pendientes al cerrar o recargar, alertar y pedir confirmación.
- NO modificar destructivamente la señal original: los filtros y recortes deben poder revertirse a la señal cargada.
- NO calcular las métricas (BPM, SDNN, RMSSD, pNN50) sobre todo el archivo: siempre sobre la ventana de tiempo visible.
- NO usar librerías gráficas que no cumplan el rendimiento exigido: render <0.1 s para 1 minuto de señal y sin parpadeos.
- NO asumir señales multicanal: la app soporta un solo canal; ante un CSV/XLSX multicanal, informar y no procesar.
- NO aplicar el recorte de inmediato: seleccionar con el mouse, mostrar un cartel de confirmación y recortar solo si el usuario acepta (RF-09, AC-13).
- NO agregar inicio de sesión ni datos por usuario: la app es de libre acceso (autenticación está Fuera de Alcance).
- NO hardcodear la API key de Claude: va en `.env` como ANTHROPIC_API_KEY.
- NO llamar a la API de Claude desde los tests: usar mocks/fakes.
- NO agregar features fuera del alcance definido: multi-usuario/roles/nube, HL7/DICOM, export a firmware, multi-tenant. La conexión a hardware por puerto serie SÍ está en alcance desde la constitución v1.4.0 (ver `specs/005-conexion-hardware-ecg/`), pero acotada a ese caso — no habilita cualquier otra integración de hardware sin su propia spec.
- NO presentar ECGViewer como herramienta de diagnóstico clínico certificado.
