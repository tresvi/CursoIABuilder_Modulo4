# Resultados de validación (quickstart) — Conexión al hardware del ECG por puerto serie

Ejecución de [`quickstart.md`](./quickstart.md) el 2026-08-26. Entorno: .NET 10, Node 20+.
Resumen: **todas las validaciones automatizables pasan**; queda pendiente la confirmación
con un dispositivo (o puerto serie simulado) real (misma categoría que T077/T078 de la
feature 001 y el Escenario 4 de la feature 004).

## Suites de tests

| Suite | Resultado |
|-------|-----------|
| Backend `dotnet test` (xUnit) | **55 passed** (15 nuevos: `SampleScalingTests`, `SerialEndpointTests`, `SerialCaptureServiceTests`) |
| Frontend `npm test` (Vitest) | **172 passed** (nuevos/tocados: `serialApi`, `SerialConfigDialog`, `Sidebar`, `useSerialConnection`, `useVisibleWindow` (autoFollow), `MainPage`) |
| Backend `dotnet build` | 0 warnings |
| Frontend `tsc --noEmit` / ESLint | 0 warnings |
| Frontend `vite build` | OK |

## Cobertura por escenario de `quickstart.md`

- **Escenario 1** (US1 — configurar puerto y velocidad, FR-001/002/003):
  `SerialEndpointTests.Ports_devuelve_*` (backend), `SerialConfigDialog.test.tsx`
  (lista de puertos, 115200 preseleccionado, confirma la elección) y
  `Sidebar.test.tsx` (sección "Conectarse" con "Configuración"). ✅ automatizado.
- **Escenario 2** (US2 — conectarse y ver el trazado en vivo, FR-006/007/008/009/012):
  `SerialCaptureServiceTests` (escalado a mV, numeración a 250 Hz, líneas no numéricas
  descartadas sin cortar la conexión, `status="error"` ante desconexión reportada),
  `SerialEndpointTests` (`/connect`, `/disconnect`, 409/400), `useSerialConnection.test.ts`
  (consumo del stream SSE, acumulación de muestras, cierre en `status:"stopped"`) y
  `MainPage.test.tsx` ("presionar 'Conectarse' reemplaza cualquier señal cargada",
  "las muestras que llegan por el hook se acumulan en el trazado"). ✅ automatizado en
  las 3 capas (backend, hook, integración de página). El límite de ≤100 ms de la
  actualización en vivo (FR-012) es una propiedad de temporización del stream SSE
  (`Task.Delay(100)` en `SerialEndpoints.cs`), no verificable con un assert de Vitest —
  requiere la confirmación visual pendiente.
- **Escenario 3** (US3 — detener y reutilizar lo capturado, FR-010, SC-004):
  `MainPage.test.tsx` ("'Desconectarse' llama a disconnect() y la señal capturada sigue
  disponible") — desconectar no borra el trazado ni las `Muestras` ya recibidas. Los
  tests ya existentes de filtro/espectro/complejos/guardar (features 003/004) sirven tal
  cual de regresión: una vez detenida la conexión, el resultado es una `Signal` común
  (data-model.md), sin lógica especial que dependa del origen de los datos. ✅ automatizado.
- **Escenario 4** (límite de 20 minutos / 300 000 muestras, FR-013):
  `SerialCaptureServiceTests.Al_acumular_300000_muestras_validas_se_detiene_sola` —
  simula las 300 000 líneas vía la fuente falsa y verifica `status="stopped"`,
  `reason="TIME_LIMIT"` y que el puerto se cerró. ✅ automatizado (sin esperar 20
  minutos reales, per diseño: el límite es por conteo de muestras válidas, D6).

## Autoseguimiento de la ventana visible (research.md D8)

Cubierto a nivel unitario en `useVisibleWindow.test.ts`: con `autoFollow=true`, cada
lote nuevo recalcula la ventana a `[último−ancho, último]` conservando el ancho actual
(no expande a todo el rango como un recorte normal), y un pan manual previo queda
pisado por el lote siguiente — mismo diseño "siempre sigue" elegido en research.md
(sin modo "pausar al interactuar").

## Pendiente

- Confirmación con un dispositivo real (o un puerto serie virtual `socat`/`com0com`)
  enviando enteros a 250 Hz: verificar que la actualización en vivo se percibe fluida
  (≤100 ms), que el trazado en mV coincide con la fórmula de escalado a simple vista, y
  que desconectar el cable a mitad de captura muestra el aviso de error esperado
  (FR-009) en vez de quedar la UI esperando en silencio.
