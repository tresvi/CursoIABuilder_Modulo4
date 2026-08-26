# Feature Specification: Detección y marcado de complejos PQRST

**Feature Branch**: `003-deteccion-complejos-pqrst`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "Necesito que en la barra lateral en la parte de filtros, quites el nombre Filtros y lo reemplaces por Diagnosticos. El primer boton de esas seccion Diagnosticos debe ser \"Detec. Complejos\". Los que debe hacer, es marcar en todo el ECG los complejos PQRST. Entiendo que ya tienes alguna funcion para detectar los complejos R porque obtienes metricas, si es posible, basate en esas."

## Clarifications

### Session 2026-08-26

- Q: ¿Qué duración de señal debe soportar el objetivo de "menos de 1 segundo" de
  SC-001? → A: Sin objetivo de tiempo fijo para señales largas: el objetivo de <1s
  aplica al archivo de referencia de rendimiento de la app (1 minuto); para señales más
  largas se admite un estado de "procesando" en vez de garantizar instantaneidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marcar los complejos PQRST del trazado (Priority: P1)

Como usuario que está analizando un ECG cargado, quiero activar una herramienta de
"Detec. Complejos" desde una sección renombrada "Diagnósticos" en la barra lateral,
para que el sistema marque automáticamente los complejos PQRST sobre todo el trazado
cargado y así pueda ubicar rápidamente los latidos sin marcarlos a mano uno por uno.

**Why this priority**: Es el valor central de la feature: sin la detección y el marcado
visual, no hay nada que entregar. Todo lo demás (poder apagarlo, avisos de baja
confianza) es soporte de esta capacidad.

**Independent Test**: Con una señal ECG ya cargada, activar "Detec. Complejos" desde la
sección "Diagnósticos" y verificar que aparecen marcas sobre los latidos a lo largo de
todo el trazado, incluso al desplazarse (pan) o hacer zoom a otras partes de la señal.

**Acceptance Scenarios**:

1. **Given** una señal ECG cargada y ninguna herramienta de diagnóstico activa, **When**
   el usuario abre la barra lateral, **Then** la sección antes llamada "Filtros" se
   muestra con el título "Diagnósticos" y su primer botón es "Detec. Complejos".
2. **Given** una señal ECG cargada, **When** el usuario activa "Detec. Complejos",
   **Then** el sistema marca los complejos PQRST detectados sobre el trazado completo
   (no solo la ventana de tiempo visible en ese momento).
3. **Given** "Detec. Complejos" activo, **When** el usuario hace zoom o desplaza la
   vista hacia otra parte de la señal, **Then** las marcas siguen apareciendo,
   correctamente ubicadas, sobre los latidos de esa nueva porción visible.
4. **Given** "Detec. Complejos" activo, **When** el usuario recarga o carga una nueva
   señal, **Then** las marcas anteriores desaparecen y (si la nueva señal lo permite) se
   recalculan sobre la señal recién cargada.
5. **Given** una señal más larga que el archivo de referencia de rendimiento de la app
   (1 minuto), **When** el usuario activa "Detec. Complejos", **Then** el sistema
   muestra un estado de "procesando" mientras calcula, sin bloquear la interfaz, y
   finalmente muestra las marcas (o el aviso correspondiente).

---

### User Story 2 - Apagar la detección sin alterar la señal (Priority: P2)

Como usuario, quiero poder desactivar "Detec. Complejos" en cualquier momento para
volver a ver el trazado limpio, con la certeza de que la señal original no fue
modificada por haber usado esta herramienta.

**Why this priority**: La app tiene como regla no modificar destructivamente la señal
original; el usuario necesita poder ir y volver de esta vista de diagnóstico con
confianza, igual que hoy puede activar y restaurar un filtro.

**Independent Test**: Con "Detec. Complejos" activo y marcas visibles, desactivarlo y
verificar que el trazado vuelve a su estado sin marcas, y que los valores de la señal
(y las métricas de la ventana visible) son idénticos a los de antes de activarlo.

**Acceptance Scenarios**:

1. **Given** "Detec. Complejos" activo con marcas visibles, **When** el usuario lo
   desactiva, **Then** las marcas desaparecen y el trazado vuelve a verse como antes de
   activarlo.
2. **Given** que el usuario activó y desactivó "Detec. Complejos" una o más veces,
   **When** se comparan los valores de la señal y las métricas de ventana antes y
   después, **Then** no hay ninguna diferencia.
3. **Given** "Detec. Complejos" activo, **When** el usuario aplica, cambia o restaura
   un filtro de señal, **Then** las marcas se recalculan automáticamente sobre la señal
   resultante (filtrada u original), sin que el usuario deba reactivar la herramienta a
   mano.

---

### User Story 3 - Aviso cuando la señal no permite una detección confiable (Priority: P3)

Como usuario, quiero que el sistema me avise cuando no puede detectar los complejos con
confianza (por ejemplo, señal muy ruidosa o sin latidos reconocibles), en vez de
mostrarme marcas erróneas que yo podría confundir con latidos reales.

**Why this priority**: Evita decisiones equivocadas basadas en marcas incorrectas;
tiene menor prioridad que las dos anteriores porque el camino feliz (US1/US2) es el que
entrega la mayor parte del valor, pero es necesario para que la herramienta sea
confiable.

**Independent Test**: Con una señal cargada que no tenga latidos reconocibles (por
ejemplo, ruido o una línea plana), activar "Detec. Complejos" y verificar que el
sistema muestra un aviso claro en vez de marcas arbitrarias.

**Acceptance Scenarios**:

1. **Given** una señal cargada sin latidos reconocibles, **When** el usuario activa
   "Detec. Complejos", **Then** el sistema informa que no pudo detectar complejos con
   confianza y no dibuja marcas arbitrarias.
2. **Given** una señal donde solo una parte es reconocible como ECG, **When** se activa
   "Detec. Complejos", **Then** el sistema marca los complejos que sí detecta con
   confianza y no marca el resto, sin presentar el resultado parcial como un error total.

### Edge Cases

- Señal demasiado corta para contener un latido completo: no debe haber marcas, y el
  sistema no debe fallar ni bloquear la interfaz.
- Señal con calidad muy variable (tramos limpios y tramos ruidosos): las marcas deben
  reflejar solo los tramos donde la detección es confiable.
- El usuario aplica o cambia un filtro de señal (Pasa Bajo/Alto/Banda, Notch) mientras
  "Detec. Complejos" está activo: la detección debe volver a ejecutarse sobre la señal
  filtrada (FR-007), sin que el usuario tenga que reactivar la herramienta a mano.
- El usuario restaura el filtro (vuelve a la señal original) mientras "Detec.
  Complejos" está activo: la detección debe volver a ejecutarse sobre la señal
  original.
- El usuario intenta activar "Detec. Complejos" sin ninguna señal cargada: el botón
  debe estar deshabilitado, igual que las demás herramientas y filtros existentes.
- Archivo CSV/XLSX multicanal: fuera de alcance, ya está cubierto por la regla
  existente de la app (se informa y no se procesa).
- Señal más larga que el archivo de referencia de rendimiento de la app (1 minuto): la
  detección puede tardar más; el sistema debe mostrar un estado de "procesando" en vez
  de bloquear la interfaz o forzar el mismo tiempo de respuesta que en señales cortas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE renombrar la sección de la barra lateral actualmente
  llamada "Filtros" a "Diagnósticos", conservando en ella los filtros de señal ya
  existentes (Pasa Bajo, Pasa Alto, Pasa Banda, Notch).
- **FR-002**: Dentro de la sección "Diagnósticos", el primer elemento DEBE ser el botón
  "Detec. Complejos", antes que los filtros de señal existentes.
- **FR-003**: Al activar "Detec. Complejos" con una señal cargada, el sistema DEBE
  detectar los complejos PQRST a lo largo de toda la señal cargada, no solo de la
  ventana de tiempo visible en ese momento.
- **FR-004**: El sistema DEBE marcar visualmente sobre el trazado ECG cada uno de los
  cinco puntos (P, Q, R, S y T) de cada complejo detectado, ubicando cada marca en su
  posición temporal y de amplitud correspondiente sobre la señal (no solo el pico R).
- **FR-005**: Las marcas DEBEN mantenerse correctamente ubicadas sobre sus complejos
  correspondientes al hacer zoom o desplazar (pan) la vista del trazado.
- **FR-006**: El usuario DEBE poder desactivar "Detec. Complejos" en cualquier momento;
  al hacerlo, las marcas desaparecen y la señal original permanece sin alteraciones
  (no destructiva).
- **FR-007**: "Detec. Complejos" y un filtro de señal (Pasa Bajo/Alto/Banda, Notch)
  DEBEN poder estar activos al mismo tiempo (no son mutuamente excluyentes). Si
  "Detec. Complejos" está activo y el usuario aplica o cambia un filtro, el sistema
  DEBE volver a ejecutar la detección sobre la señal ya filtrada, dado que el filtrado
  puede desplazar temporalmente la ubicación real de los complejos.
- **FR-008**: Cuando la señal cargada (o una parte de ella) no permita una detección
  confiable de complejos, el sistema DEBE informarlo al usuario en vez de mostrar
  marcas incorrectas o arbitrarias en esa parte.
- **FR-009**: El botón "Detec. Complejos" DEBE estar deshabilitado cuando no hay ninguna
  señal cargada, de forma consistente con el resto de herramientas y filtros de la
  barra lateral.
- **FR-010**: Las marcas de complejos detectados NUNCA se persisten como parte del
  estudio guardado; son siempre una vista derivada que se recalcula sobre la señal
  actualmente mostrada (original o filtrada) cada vez que la herramienta está activa.
- **FR-011**: Las marcas de complejos detectados DEBEN ser visualmente distinguibles de
  los marcadores manuales que el usuario coloca con la herramienta "Marcar" existente,
  para evitar confundir un resultado automático con una anotación manual.
- **FR-012**: Para señales cuya duración supere el archivo de referencia de rendimiento
  de la app (1 minuto), el sistema DEBE poder mostrar un estado de "procesando" mientras
  calcula o recalcula los complejos, sin bloquear el resto de la interfaz, en vez de
  garantizar el mismo tiempo de respuesta que para señales cortas.

### Key Entities

- **Complejo PQRST detectado**: unidad que representa un latido identificado sobre la
  señal cargada; se ubica en un instante o rango de tiempo dentro del trazado y es el
  resultado de un análisis automático, no de una acción manual del usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sobre el archivo de referencia de rendimiento de la app (1 minuto de
  señal), al activar "Detec. Complejos" el usuario ve las marcas sobre el trazado en
  menos de 1 segundo, sin pasos adicionales. Para señales más largas, el sistema puede
  mostrar un estado de "procesando" en vez de garantizar ese tiempo, pero siempre debe
  terminar y mostrar el resultado (marcas o aviso de baja confianza) sin bloquear la
  interfaz.
- **SC-002**: Sobre una señal ECG típica de ritmo regular y buena calidad, al menos el
  90% de los latidos realmente presentes quedan marcados.
- **SC-003**: El usuario puede activar y desactivar "Detec. Complejos" cualquier
  cantidad de veces sin que la señal original ni las métricas de ventana cambien en lo
  más mínimo.
- **SC-004**: El 100% de las veces que la señal (o un tramo de ella) no permite una
  detección confiable, el usuario recibe un aviso en vez de marcas silenciosamente
  incorrectas.

## Assumptions

- La app ya cuenta con una capacidad interna que ubica el pico R de cada latido (usada
  hoy para calcular métricas como BPM/HRV); esta feature reutiliza esa ubicación como
  ancla de cada complejo y construye sobre ella la búsqueda de P, Q, S y T. El enfoque
  algorítmico exacto para esos cuatro puntos queda como decisión de la fase de
  planificación técnica.
- Las marcas de P, Q, R, S y T se representan como señales puntuales ubicadas sobre el
  propio trazado (en su coordenada real de tiempo y amplitud), y no como líneas
  verticales de altura completa — ese estilo queda reservado para los marcadores
  manuales existentes, para que ambos tipos de marca no se confundan (FR-011). El
  detalle visual exacto (color, forma, si se muestra la letra según el nivel de zoom)
  se termina de definir en la planificación.
- "Todo el ECG" se interpreta como la señal completa cargada en memoria, no solo la
  ventana de tiempo visible; esto es coherente con que el trazado completo ya se
  mantiene cargado y solo se renderiza la porción visible en cada momento.
- La sección renombrada "Diagnósticos" agrupa tanto la nueva detección de complejos
  como los filtros de señal ya existentes; no se le pide a esta feature separarlos en
  dos secciones distintas.
- Queda fuera de alcance de esta feature: la idealización del trazado (redibujar los
  complejos sobre una forma ideal) y el filtrado automático inteligente; ambos siguen
  siendo ítems separados del backlog.
- Se mantiene la restricción existente de la app de un solo canal por señal; ante un
  archivo multicanal, la detección de complejos no aplica (ya se informa y no se
  procesa el archivo).
