# Research: Conexión al hardware del ECG por puerto serie

Contexto revisado: stack existente (`src/backend` .NET 10 Minimal API con
`Endpoints/`/`Dsp/`/`Models/`; `src/frontend` React con hooks tipo
`useComplexDetection`/`useVisibleWindow`), constitución v1.4.0 (recién enmendada
para permitir esta feature).

## D1: Dónde vive el acceso al puerto serie — backend, no Web Serial API

**Decision**: El backend (.NET, `System.IO.Ports.SerialPort`, dependencia NuGet
nueva) abre y lee el puerto; el frontend nunca accede al hardware directamente.

**Rationale**: La alternativa (Web Serial API del navegador) **solo funciona en
Chromium** (Chrome/Edge) y exige contexto seguro (HTTPS o localhost) — dejaría
Firefox/Safari sin poder usar la feature. .NET con `System.IO.Ports` funciona
igual sin importar el navegador, y mantiene el trabajo de bajo nivel/SO en el
backend, mismo criterio que ya se usa para DSP (`FftSharp`).

**Alternatives considered**: Web Serial API en el frontend — descartada por la
limitación de navegador.

## D2: Cómo llegan los datos al frontend — Server-Sent Events (SSE)

**Decision**: Un endpoint `GET /api/serial/stream` que mantiene la conexión
HTTP abierta y empuja lotes de muestras ya escaladas cada ~100 ms (alineado con
FR-012/Principio V), en vez de WebSocket o polling.

**Rationale**: El flujo de datos es unidireccional (backend → frontend); SSE es
más simple que WebSocket para este caso (nativo del navegador vía `EventSource`,
sin librería nueva en el frontend) y evita el desperdicio de polling. Agrupar en
lotes de ~100 ms coincide exactamente con el tope de actualización visual que ya
pide la constitución, así que el backend hace el throttling una sola vez en vez
de que el frontend reciba 250 eventos/s y los descarte.

**Alternatives considered**: WebSocket (más complejo, no hace falta
bidireccionalidad) — polling (ineficiente a esta cadencia).

## D3: Comandos de conexión — REST simple, separado del stream

**Decision**: `GET /api/serial/ports` (lista de puertos disponibles),
`POST /api/serial/connect { port, baudRate }`, `POST /api/serial/disconnect`.
El stream de datos (D2) es un recurso aparte.

**Rationale**: Separar "abrir/cerrar la conexión" (acciones puntuales) de
"recibir datos" (flujo continuo) es más simple de testear y de razonar que
mezclar todo en un único endpoint.

## D4: Escalado de la muestra — en el backend, junto a la lectura

**Decision**: El backend aplica `Valor_Escalado = cuenta × Span + Zero`
(`Span = 10/4095`, `Zero = 0`) al leer cada línea, antes de enviarla al
frontend — nunca se envía la cuenta cruda.

**Rationale**: Evita duplicar la fórmula en dos lenguajes (C# y TypeScript);
mismo criterio que ya se sigue con los filtros DSP y el espectro de potencia
(el cálculo numérico vive en el backend).

## D5: Asignación de tiempo — índice de muestra, no reloj de pared

**Decision**: El backend numera cada muestra válida con un contador incremental
`n` (arrancando en 0 al conectar) y calcula `t = n / 250` segundos — nunca usa
la hora real de llegada del dato.

**Rationale**: Es exactamente lo que pide FR-007: tratar los datos como si
fueran tomados a una frecuencia de muestreo fija de 250 Hz, sin importar el
ritmo real de llegada por el puerto (que puede tener jitter).

## D6: Límite de 20 minutos — contar muestras válidas

**Decision**: El backend cierra el puerto solo (mismo resultado que
"Desconectarse") al llegar a 300 000 muestras válidas (250 Hz × 20 min), sin
necesitar un reloj de pared aparte — ya que D5 fija la relación 1 muestra = 1/250 s.

**Rationale**: Consistente con D5: contar muestras válidas es exactamente
equivalente a contar segundos transcurridos de señal.

## D7: Reemplazo de la señal actual — mismo flujo que cargar un archivo

**Decision**: Al conectar, el frontend arranca una señal nueva vacía (mismo
`initDerivation` que ya usa la carga de CSV/XLSX) y la va llenando con cada
lote que llega por SSE — reemplazando cualquier señal previa, sin diálogo de
confirmación adicional (FR-011, igual que cargar un archivo hoy).

## D8: Ventana visible sigue el extremo más reciente mientras está conectado

**Decision**: Mientras hay una conexión activa, la ventana visible se recalcula
en cada lote para mostrar siempre los últimos `W` segundos (donde `W` es el
ancho de la ventana que ya estaba mostrando, o el ancho inicial por defecto si
es la primera vez) — "autoseguimiento" simple, que **siempre gana** sobre
cualquier pan/zoom manual mientras dura la conexión (no hay un estado
intermedio de "pausar autoseguimiento"). Al desconectar, el autoseguimiento se
apaga y el usuario recupera control total de zoom/pan como con cualquier señal
ya cargada.

**Rationale**: Es el comportamiento más simple y predecible que satisface "ver
el trazado en vivo como un monitor" (spec, Assumptions) sin inventar una
máquina de estados de "el usuario interactuó, dejar de autoseguir por N
segundos". Si en el uso real resulta molesto no poder pausear el
autoseguimiento para mirar un tramo pasado mientras se sigue capturando, es un
ajuste de seguimiento (follow-up), no bloqueante para esta feature.

**Alternatives considered**: Autoseguimiento que se pausa ante interacción
manual y se reanuda con un botón "Volver al final" — más completo pero
significativamente más complejo; se deja fuera del alcance inicial.

## D9: Servicio único de captura (sin multi-sesión)

**Decision**: Un servicio singleton en el backend (`SerialCaptureService`)
mantiene el estado de la única conexión posible a la vez (idle/conectado/error),
igual que `StudyRepository` maneja el único estudio persistido — consistente
con que la app es de libre acceso, sin usuarios ni sesiones concurrentes.

## Resumen de Technical Context

Todas las incógnitas quedaron resueltas; no quedan `NEEDS CLARIFICATION`
pendientes para `plan.md`. Nueva dependencia de backend: `System.IO.Ports`
(paquete NuGet estándar de Microsoft, multiplataforma).
