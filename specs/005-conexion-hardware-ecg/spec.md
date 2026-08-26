# Feature Specification: Conexión al hardware del ECG por puerto serie

**Feature Branch**: `005-conexion-hardware-ecg`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "En la barra lateral debe haber una nueva area (asi como está Herramientas y Diagnostico) que permita conectarme al hardware del ECG. El area se llamara conectarse. Deberá haber un boton llamado Configuracion que muestre una ventana para elegir los puertos COM disponibles en el dispositivo, asi como su velocidad. Por Default la velocidad sera de 115200 baudios. Deberá haber tambien un boton llamado Conectarse, que abra el puerto y espere que le llegen datos. Los datos llegaran como enteros, cada entero en una linea nueva. y el mismo deberá ser escalado segun el siguiente calculo: Span = (10-0)/(4095-0) ≈ 0.00244 mV/cuento; Zero = 0; Valor_Escalado = cuenta × Span + Zero. Los mismos seran valores de mV y deberan ser considerados como muestras tomadas con una frecuencia de muestreo de 250Hz."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar el puerto y la velocidad de conexión (Priority: P1)

Como usuario que tiene un dispositivo de ECG conectado a la computadora, quiero abrir
"Configuración" desde una nueva sección "Conectarse" en la sidebar, elegir entre los
puertos serie (COM) disponibles y su velocidad, para dejar todo listo antes de
conectarme.

**Why this priority**: Sin poder elegir el puerto correcto, no hay forma de conectarse
a un dispositivo real; es el primer paso obligatorio del flujo.

**Independent Test**: Con un dispositivo serie disponible en el sistema, abrir
"Configuración" y verificar que aparece en la lista de puertos elegibles, con 115200
baudios preseleccionado.

**Acceptance Scenarios**:

1. **Given** la sidebar abierta, **When** el usuario mira la barra lateral, **Then** ve
   una nueva sección "Conectarse" (al mismo nivel que "Herramientas" y "Diagnósticos")
   con un botón "Configuración".
2. **Given** el usuario presiona "Configuración", **When** se abre la ventana, **Then**
   ve la lista de puertos serie disponibles en la computadora y un campo de velocidad
   con **115200 baudios** preseleccionado.
3. **Given** la ventana de Configuración abierta, **When** el usuario elige un puerto y
   una velocidad y confirma, **Then** esa elección queda guardada para cuando presione
   "Conectarse".
4. **Given** no hay ningún puerto serie disponible en la computadora, **When** el
   usuario abre "Configuración", **Then** se informa que no hay puertos disponibles en
   vez de mostrar una lista vacía sin explicación.

---

### User Story 2 - Conectarse y recibir la señal del dispositivo (Priority: P1)

Como usuario ya configurado, quiero presionar "Conectarse" para que la app abra el
puerto elegido, reciba los datos que envía el dispositivo y los muestre como señal ECG
en milivoltios, para poder ver el trazado en vivo sin tener que grabarlo primero a un
archivo.

**Why this priority**: Es el valor central de la feature: conectar es el punto de toda
la funcionalidad.

**Independent Test**: Con el puerto configurado y un dispositivo enviando enteros (uno
por línea), presionar "Conectarse" y verificar que el trazado muestra una señal en mV
coherente con los valores enviados.

**Acceptance Scenarios**:

1. **Given** un puerto configurado, **When** el usuario presiona "Conectarse", **Then**
   la app abre ese puerto a la velocidad elegida y queda a la espera de datos.
2. **Given** el puerto abierto, **When** llega una línea con un entero, **Then** el
   sistema lo convierte a milivoltios con la fórmula
   `Valor_Escalado = cuenta × (10 / 4095) + 0` (p. ej. la cuenta 2048 produce ≈ 5 mV) y
   lo agrega a la señal como una muestra nueva.
3. **Given** que llegan muestras de forma continua, **When** se van agregando, **Then**
   se tratan como tomadas a una frecuencia de muestreo fija de **250 Hz** (es decir, la
   muestra `n` corresponde al instante `n / 250` segundos), sin importar el ritmo real
   de llegada por el puerto.
4. **Given** una línea recibida que no es un entero válido, **When** el sistema la
   procesa, **Then** la descarta sin interrumpir la conexión ni el resto de la
   captura.
5. **Given** una conexión en curso, **When** el dispositivo se desconecta o el puerto
   deja de responder, **Then** el sistema lo informa claramente en vez de quedar
   esperando datos indefinidamente sin avisar.
6. **Given** una conexión activa, **When** llegan nuevas muestras, **Then** el trazado
   y las métricas se actualizan en vivo, sin que el usuario tenga que hacer nada
   (actualización visual como máximo cada 100 ms).
7. **Given** una conexión activa, **When** pasan 20 minutos desde que se conectó,
   **Then** la conexión se detiene sola y lo capturado queda disponible, igual que si
   el usuario hubiera presionado "Detener".

---

### User Story 3 - Detener la conexión y quedarse con lo capturado (Priority: P2)

Como usuario, quiero poder detener la conexión cuando quiera y seguir teniendo
disponible todo lo que se capturó hasta ese momento, para poder analizarlo con el
resto de las herramientas de la app (métricas, filtros, espectro, guardar) igual que
si lo hubiera cargado desde un archivo.

**Why this priority**: Completa el ciclo de vida de la captura; sin esto la sesión en
vivo no se puede aprovechar después de conectar.

**Independent Test**: Con una conexión activa que ya recibió algunas muestras, detener
la conexión y verificar que la señal capturada sigue visible y se puede filtrar,
analizar y guardar igual que una señal cargada por archivo.

**Acceptance Scenarios**:

1. **Given** una conexión activa, **When** el usuario la detiene, **Then** el puerto se
   cierra y la señal capturada hasta ese momento queda disponible para el resto de la
   app.
2. **Given** una señal capturada por hardware y ya detenida la conexión, **When** el
   usuario usa métricas, filtros, espectro, marcadores o guardar, **Then** funcionan
   igual que sobre una señal cargada desde CSV/XLSX.

### Edge Cases

- El usuario intenta "Conectarse" sin haber configurado antes un puerto: debe quedar
  claro que hace falta configurar primero (por ejemplo, deshabilitando "Conectarse"
  hasta tener una configuración válida).
- El puerto elegido ya está siendo usado por otro programa, o no responde: informar el
  error en vez de fallar en silencio.
- El usuario ya tiene una señal cargada (por archivo o por una captura anterior) y
  presiona "Conectarse": se reemplaza por la nueva sesión de captura (FR-011).
- Una sesión de captura llega a los 20 minutos: se detiene sola, igual que si el
  usuario hubiera presionado "Detener" (FR-013).
- El navegador o entorno no tiene forma de acceder a puertos serie (limitación técnica
  del entorno de ejecución, no de esta especificación): debe informarse igual que
  cualquier otro caso de puerto no disponible (US1, Acceptance Scenario 4).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE agregar una nueva sección "Conectarse" en la barra
  lateral, al mismo nivel que "Herramientas" y "Diagnósticos".
- **FR-002**: La sección "Conectarse" DEBE tener un botón "Configuración" que abre una
  ventana para elegir el puerto serie (entre los disponibles en la computadora) y la
  velocidad de conexión.
- **FR-003**: La velocidad DEBE tener **115200 baudios** como valor por defecto.
- **FR-004**: La sección "Conectarse" DEBE tener un botón "Conectarse" que abre el
  puerto configurado y queda a la espera de datos.
- **FR-005**: Cada línea recibida por el puerto DEBE interpretarse como un número
  entero.
- **FR-006**: Cada entero recibido DEBE convertirse a milivoltios con la fórmula
  `Valor_Escalado = cuenta × Span + Zero`, con `Span = (10 − 0) / (4095 − 0)` y
  `Zero = 0` (una cuenta de 2048 produce ≈ 5 mV).
- **FR-007**: Las muestras escaladas DEBEN tratarse como tomadas a una frecuencia de
  muestreo fija de **250 Hz**, asignando a la muestra `n` el instante `n / 250`
  segundos, independientemente del ritmo real de llegada de los datos.
- **FR-008**: Una línea recibida que no se pueda interpretar como entero DEBE
  descartarse sin interrumpir la conexión.
- **FR-009**: El sistema DEBE informar claramente cuando: no hay puertos serie
  disponibles, el puerto elegido no se puede abrir, o la conexión se pierde durante la
  captura.
- **FR-010**: El usuario DEBE poder detener la conexión en cualquier momento; al
  hacerlo, el puerto se cierra y la señal capturada hasta ese momento queda disponible
  para el resto de la app (métricas, filtros, espectro, marcadores, guardar) igual que
  una señal cargada desde archivo.
- **FR-011**: Al presionar "Conectarse", el sistema DEBE reemplazar cualquier señal
  actualmente cargada (por archivo o por una captura anterior) con la nueva sesión de
  captura, con el mismo comportamiento que ya tiene cargar un archivo nuevo (sin un
  paso de confirmación adicional).
- **FR-012**: Mientras la conexión está activa, el trazado y las métricas DEBEN
  actualizarse en vivo (comportamiento de monitor en tiempo real), con una frecuencia
  de actualización visual de como máximo una vez cada 100 ms — no hace falta redibujar
  por cada muestra individual (a 250 Hz eso sería cada 4 ms).
- **FR-013**: Una sesión de captura DEBE detenerse automáticamente al llegar a
  **20 minutos** de duración (equivalentes a 250 Hz × 20 min = 300 000 muestras),
  con el mismo resultado que si el usuario hubiera presionado "Detener": el puerto se
  cierra y lo capturado hasta ese momento queda disponible para el resto de la app.

### Key Entities

- **Configuración de conexión**: puerto serie elegido y velocidad (baudios); vive solo
  para la sesión actual, no se persiste con el estudio.
- **Sesión de captura**: la señal (muestras en mV a 250 Hz) que se va formando mientras
  la conexión está activa; al detenerla, se convierte en una señal como cualquier otra
  que ya maneja la app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede elegir un puerto y conectarse en menos de 3 pasos desde
  la sidebar (Configuración → elegir puerto/velocidad → Conectarse).
- **SC-002**: El 100% de los enteros válidos recibidos se reflejan en el trazado con el
  valor en mV correcto según la fórmula de escalado.
- **SC-003**: El 100% de las veces que el puerto no está disponible, no responde, o se
  desconecta a mitad de captura, el usuario recibe un aviso claro (nunca queda
  esperando sin explicación).
- **SC-004**: Una señal capturada por hardware se puede analizar (métricas, filtros,
  espectro, marcadores) y guardar exactamente igual que una cargada desde archivo, sin
  ninguna limitación adicional.
- **SC-005**: Durante una conexión activa, el usuario ve el trazado actualizarse en
  vivo con una demora perceptible de como máximo ~100 ms desde que llega cada dato.
- **SC-006**: El 100% de las sesiones de captura que llegan a los 20 minutos se
  detienen solas, sin perder los datos ya capturados.

## Assumptions

- El puerto serie se abre desde el navegador (Web Serial API), no desde el backend:
  el backend puede correr en un contenedor remoto sin afectar esta feature, porque el
  acceso al hardware ocurre enteramente en la máquina donde la persona usuaria tiene
  abierto el navegador (que es, por definición, donde está conectado el dispositivo).
  Esto exige un navegador compatible (Chrome/Edge/Opera) y contexto seguro (HTTPS o
  `localhost`); Firefox/Safari no podrán usar esta feature.
- La app sigue soportando un solo canal por señal (restricción ya existente): la
  captura por hardware entrega un único valor por línea, consistente con esa
  restricción.
- Mientras la conexión está activa, la ventana de tiempo visible sigue el extremo más
  reciente de la señal (comportamiento de monitor: se ve siempre lo último que llegó),
  salvo que el usuario navegue manualmente hacia atrás; esto es un supuesto de UX
  razonable dado el pedido de actualización en vivo (FR-012), a confirmar en el detalle
  de planificación.
- El límite de 20 minutos (FR-013) resulta en sesiones de hasta 300 000 muestras
  (250 Hz × 20 min), un orden de magnitud ya manejado hoy por la app con archivos
  cargados de varios minutos.
- Esta feature **excede el alcance actual documentado en la constitución del proyecto**
  ("Fuera de Alcance": captura en tiempo real por hardware) y requiere una enmienda a
  `.specify/memory/constitution.md` antes de poder implementarse — se deja registrado
  acá para que se resuelva en la fase de planificación, no en esta especificación.
