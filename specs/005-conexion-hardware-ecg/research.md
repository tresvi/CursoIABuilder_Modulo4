# Research: Conexión al hardware del ECG por puerto serie

Contexto revisado: stack existente (`src/backend` .NET 10 Minimal API con
`Endpoints/`/`Dsp/`/`Models/`; `src/frontend` React con hooks tipo
`useComplexDetection`/`useVisibleWindow`), constitución v1.4.0 (recién enmendada
para permitir esta feature).

## D1: Dónde vive el acceso al puerto serie — el navegador, vía Web Serial API

**Decision**: El puerto serie se abre y se lee enteramente en el frontend, con
`navigator.serial` (Web Serial API). El backend no tiene ningún código de
gestión de puertos ni de captura en vivo.

**Rationale**: El backend de ECGViewer corre en un contenedor — no tiene, ni
puede tener en general, acceso al puerto serie físico de la computadora de
quien usa la app (el hardware del ECG está conectado por USB a esa máquina, no
al host donde corre el contenedor). El único proceso que sí corre en esa
máquina es el navegador, así que el acceso al puerto tiene que vivir ahí. La
limitación de la Web Serial API (solo Chromium — Chrome/Edge/Opera — y exige
contexto seguro, HTTPS o `localhost`) es un límite conocido y aceptable frente
a la alternativa de que la feature no funcione en absoluto con un backend
containerizado.

**Alternatives considered**: Abrir el puerto desde el backend con
`System.IO.Ports.SerialPort` — descartada: solo sirve si backend y hardware
comparten la misma máquina sin contenedores de por medio, algo que no se puede
asumir como forma de despliegue de ECGViewer.

## D2: Cómo llegan los datos a la UI — estado de un hook de React, sin red

**Decision**: Un hook (`useSerialConnection`) lee el `ReadableStream` del
puerto directamente y expone las muestras ya escaladas como estado de React.
No hay ningún viaje por HTTP: todo ocurre en el mismo proceso (pestaña del
navegador).

**Rationale**: Al no haber backend involucrado, no hace falta streaming por
red (SSE/WebSocket/polling) — el "transporte" es simplemente la lectura del
stream del propio `SerialPort` del navegador. Las muestras se acumulan en un
buffer y se vuelcan al estado en lotes cada ~100 ms (mismo criterio que
Principio V / FR-012: no se dispara un render por cada línea recibida a 250 Hz).

## D3: Comandos de conexión — funciones del hook, no endpoints

**Decision**: `connect({ port, baudRate })` y `disconnect()` son métodos del
hook `useSerialConnection`; elegir el dispositivo es
`navigator.serial.requestPort()` (selector nativo del navegador). No existen
`/api/serial/*` en el backend.

**Rationale**: Sin acceso al hardware desde el backend, no hay nada que un
endpoint REST pudiera intermediar — "abrir/cerrar" y "elegir dispositivo" son
operaciones que solo tienen sentido del lado del navegador.

## D4: Escalado de la muestra — en el frontend, junto a la lectura

**Decision**: El frontend aplica `Valor_Escalado = cuenta × Span + Zero`
(`Span = 10/4095`, `Zero = 0`) al leer cada línea del puerto
(`signal/sampleScaling.ts`), antes de acumularla como muestra.

**Rationale**: Es la única fórmula que hace falta y ya no hay backend en el
camino de estos datos; ponerla ahí evita un viaje de ida y vuelta sin motivo.

## D5: Asignación de tiempo — índice de muestra, no reloj de pared

**Decision**: El hook numera cada muestra válida con un contador incremental
`n` (arrancando en 0 al conectar) y calcula `t = n / 250` segundos — nunca usa
la hora real de llegada del dato.

**Rationale**: Es exactamente lo que pide FR-007: tratar los datos como si
fueran tomados a una frecuencia de muestreo fija de 250 Hz, sin importar el
ritmo real de llegada por el puerto (que puede tener jitter).

## D6: Límite de 20 minutos — contar muestras válidas

**Decision**: El hook cierra el puerto solo (mismo resultado que
"Desconectarse") al llegar a 300 000 muestras válidas (250 Hz × 20 min), sin
necesitar un reloj de pared aparte — ya que D5 fija la relación 1 muestra = 1/250 s.

**Rationale**: Consistente con D5: contar muestras válidas es exactamente
equivalente a contar segundos transcurridos de señal.

## D7: Reemplazo de la señal actual — mismo flujo que cargar un archivo

**Decision**: Al conectar, el frontend arranca una señal nueva vacía (mismo
`initDerivation` que ya usa la carga de CSV/XLSX) y la va llenando con cada
lote de muestras del hook — reemplazando cualquier señal previa, sin diálogo
de confirmación adicional (FR-011, igual que cargar un archivo hoy).

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
segundos". Si en el uso real resulta molesto no poder pausar el
autoseguimiento para mirar un tramo pasado mientras se sigue capturando, es un
ajuste de seguimiento (follow-up), no bloqueante para esta feature.

**Alternatives considered**: Autoseguimiento que se pausa ante interacción
manual y se reanuda con un botón "Volver al final" — más completo pero
significativamente más complejo; se deja fuera del alcance inicial.

## D9: Una sola conexión a la vez (sin multi-sesión)

**Decision**: El hook `useSerialConnection` modela una única conexión activa
por vez (idle/conectado/detenido/error) — consistente con que la app es de
libre acceso, sin usuarios ni sesiones concurrentes, y con que solo hay un
dispositivo de hardware por instancia de la app abierta en el navegador.

## Resumen de Technical Context

Todas las incógnitas quedaron resueltas; no quedan `NEEDS CLARIFICATION`
pendientes. El backend no tiene ninguna dependencia ni código nuevos para esta
feature: toda la lógica (acceso al puerto, escalado, límite de 20 minutos)
vive en `src/frontend/src/hooks/useSerialConnection.ts` y
`src/frontend/src/signal/sampleScaling.ts`.
