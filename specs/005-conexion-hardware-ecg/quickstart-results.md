# Resultados de validación (quickstart) — Conexión al hardware del ECG por puerto serie

Ejecución de [`quickstart.md`](./quickstart.md) el 2026-08-26. Entorno: Node 20+.
La conexión al hardware vive enteramente en el **frontend** vía Web Serial API
(`navigator.serial`) — el backend no tiene ningún código de esta feature
(research.md D1: corre en un contenedor, sin acceso al puerto físico de quien
usa la app). Resumen: **todas las validaciones automatizables pasan**; queda
pendiente la confirmación con un dispositivo (o puerto serie simulado) real en
un navegador Chromium.

## Suites de tests

| Suite | Resultado |
|-------|-----------|
| Backend `dotnet test` (xUnit) | **40 passed** (sin tests de esta feature: no hay código de backend) |
| Frontend `npm test` (Vitest) | **180 passed** (nuevos/tocados: `sampleScaling`, `SerialConfigDialog`, `Sidebar`, `useSerialConnection`, `useVisibleWindow` (autoFollow), `MainPage`) |
| Backend `dotnet build` | 0 warnings |
| Frontend `tsc --noEmit` / ESLint | 0 warnings |
| Frontend `vite build` | OK |

## Cobertura por escenario de `quickstart.md`

- **Escenario 1** (US1 — configurar puerto y velocidad, FR-001/002/003):
  `SerialConfigDialog.test.tsx` (botón "Elegir dispositivo" llama a
  `requestPort()`, 115200 preseleccionado, confirma puerto+baudios; sin
  soporte de Web Serial API muestra un aviso) y `Sidebar.test.tsx` (sección
  "Conectarse" con "Configuración"). ✅ automatizado.
- **Escenario 2** (US2 — conectarse y ver el trazado en vivo, FR-006/007/008/009/012):
  `useSerialConnection.test.ts` (escalado a mV, numeración a 250 Hz, líneas no
  numéricas descartadas sin cortar la conexión, `status="error"` si el stream
  del puerto se corta) y `MainPage.test.tsx` ("presionar 'Conectarse'
  reemplaza cualquier señal cargada", "las muestras que llegan por el hook se
  acumulan en el trazado"). ✅ automatizado. El límite de ≤100 ms de la
  actualización en vivo (FR-012) es una propiedad de temporización del
  batching interno del hook (`setInterval(BATCH_MS)`), no verificable con un
  assert de Vitest — requiere la confirmación visual pendiente.
- **Escenario 3** (US3 — detener y reutilizar lo capturado, FR-010, SC-004):
  `MainPage.test.tsx` ("'Desconectarse' cierra el puerto y la señal capturada
  sigue disponible"). Los tests ya existentes de filtro/espectro/complejos/
  guardar (features 003/004) sirven tal cual de regresión: una vez detenida
  la conexión, el resultado es una `Signal` común (data-model.md). ✅ automatizado.
- **Escenario 4** (límite de 20 minutos / 300 000 muestras, FR-013):
  `useSerialConnection.test.ts` ("al acumular 300000 muestras válidas se
  detiene sola") — empuja las 300 000 líneas de una vez al stream simulado y
  verifica `status="stopped"`, `reason="TIME_LIMIT"` y que el puerto se
  cerró. ✅ automatizado (sin esperar 20 minutos reales, por diseño: el
  límite es por conteo de muestras válidas, D6).

## Autoseguimiento de la ventana visible (research.md D8)

Cubierto a nivel unitario en `useVisibleWindow.test.ts`: con `autoFollow=true`,
cada lote nuevo recalcula la ventana a `[último−ancho, último]` conservando el
ancho actual (no expande a todo el rango como un recorte normal), y un pan
manual previo queda pisado por el lote siguiente — mismo diseño "siempre
sigue" elegido en research.md (sin modo "pausar al interactuar").

## Pendiente

- Confirmación en un navegador Chromium real (Chrome/Edge/Opera, sobre HTTPS o
  `localhost`) con un dispositivo real o un puerto serie virtual (`socat`/
  `com0com`) enviando enteros a 250 Hz: verificar que `requestPort()` muestra
  el selector nativo esperado, que la actualización en vivo se percibe fluida
  (≤100 ms), que el trazado en mV coincide con la fórmula de escalado a simple
  vista, y que desconectar el cable a mitad de captura dispara el aviso de
  error esperado (FR-009).
- Confirmar en Firefox/Safari que la app informa claramente la falta de
  soporte de Web Serial API en vez de fallar en silencio (edge case de
  `spec.md`).
