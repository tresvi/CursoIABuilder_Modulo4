# Feature Specification: ECGViewer — Visor y analizador web de ECG desde CSV/XLSX

**Feature Branch**: `001-ecg-viewer`

**Created**: 2026-07-11

**Status**: Draft

**Input**: User description: "Generá el spec a partir del PRD en docs/PRD.md" (PRD-001)

## Clarifications

### Session 2026-07-11

- Q: Tras "Guardar", ¿qué puede hacer el usuario con un estudio guardado? → A: Se guarda/restaura un único trabajo actual (un solo estudio), sin lista de estudios ni comparación entre estudios.
- Q: ¿Qué muestra el panel cuando la ventana visible tiene pocos latidos para calcular HRV? → A: Las métricas no calculables (SDNN, RMSSD, pNN50, y BPM si no hay al menos un intervalo RR) se muestran como "no disponible" ("—"), no como 0 ni ocultando el panel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cargar y visualizar una señal ECG (Priority: P1)

Un estudiante o docente de ingeniería biomédica tiene un archivo con una señal de ECG de
un solo canal y quiere verla graficada para poder inspeccionarla. Selecciona el archivo, el
sistema valida su formato y dibuja la señal en un gráfico con el tiempo en el eje X (en
segundos) y la amplitud en el eje Y (en mV), opcionalmente con una rejilla de fondo tipo
papel ECG.

**Why this priority**: Es el corazón del producto y el mínimo entregable con valor: sin
carga y visualización, ninguna otra función tiene sentido. Un usuario ya obtiene valor solo
con poder ver su señal en pantalla.

**Independent Test**: Cargar un CSV válido de un canal y verificar que la señal aparece
dibujada con ejes correctos, y que un archivo inválido o multicanal es rechazado con un
mensaje claro sin dibujar nada.

**Acceptance Scenarios**:

1. **Given** un archivo CSV válido de un canal con encabezado y columnas tiempo/valor,
   **When** el usuario lo carga, **Then** el sistema acepta la señal y la dibuja sin
   errores, con el tiempo en el eje X (s) y la amplitud en el eje Y (mV) —cada eje con su
   **escala numérica visible** (ticks con valores y unidad)—, respetando el orden temporal
   del archivo.
2. **Given** un archivo CSV con formato inválido (columnas faltantes, valores no numéricos
   o encabezado incorrecto), **When** el usuario intenta cargarlo, **Then** el sistema
   muestra un mensaje de error y no carga la señal.
3. **Given** un archivo CSV con más de un canal, **When** el usuario intenta cargarlo,
   **Then** el sistema informa que solo soporta un canal y no procesa el archivo.
4. **Given** una señal ya dibujada, **When** el usuario activa o desactiva la rejilla ECG,
   **Then** la cuadrícula tipo papel milimetrado (finas cada 1 mm, gruesas cada 5 mm, con
   ganancia 10 mm/mV en Y) se muestra u oculta sobre el gráfico, anclada a la señal.
5. **Given** la rejilla activa, **When** el usuario cambia la velocidad de papel entre 25 y
   50 mm/s, **Then** el paso temporal de la cuadrícula en el eje X se ajusta (a 25 mm/s un
   cuadro grande = 0.2 s; a 50 mm/s = 0.1 s).

---

### User Story 2 - Consultar métricas cardíacas sobre la ventana visible (Priority: P1)

El usuario quiere conocer las métricas cardíacas de un segmento concreto de la señal. El
sistema calcula y muestra BPM, SDNN, RMSSD y pNN50 usando únicamente los datos de la
ventana de tiempo visible en ese momento, y las recalcula cada vez que el usuario cambia el
rango visible.

**Why this priority**: Junto con la visualización, el análisis de métricas es el valor
central para la investigación y la docencia. Depende de US1 pero constituye el segundo
pilar del MVP.

**Independent Test**: Con una señal cargada y una ventana visible dada, verificar que las
cuatro métricas se muestran calculadas solo sobre esa ventana; cambiar el rango visible y
verificar que los valores se recalculan.

**Acceptance Scenarios**:

1. **Given** un gráfico con una ventana de tiempo visible, **When** se calculan las
   métricas, **Then** BPM, SDNN, RMSSD y pNN50 se muestran calculados únicamente sobre los
   datos visibles en esa ventana, no sobre todo el archivo.
2. **Given** que el usuario cambia el rango visible (zoom o desplazamiento), **When** el
   gráfico se actualiza, **Then** las métricas se recalculan y reflejan el nuevo rango.

---

### User Story 3 - Navegar la señal con zoom y desplazamiento (Priority: P2)

El usuario necesita acercarse a un tramo temporal de interés para inspeccionarlo en detalle
y luego volver a la vista completa. Con la herramienta Zoom activa, arrastra
horizontalmente sobre el gráfico para seleccionar un rango de tiempo y, al soltar, la vista
se acerca a ese rango; una opción de "Restablecer zoom" vuelve a la señal completa. Cuando la
vista está ampliada, con la herramienta Desplazar (pan) puede arrastrar horizontalmente para
mover la ventana visible por la señal.

**Why this priority**: Habilita la inspección detallada y, combinada con US2, define qué
ventana se analiza. Es muy usada pero la app entrega valor sin ella (se puede ver el total).

**Independent Test**: Arrastrar horizontalmente con Zoom activo y verificar que la vista se
acerca al rango seleccionado; usar "Restablecer zoom" y verificar que vuelve a la señal
completa; con la vista ampliada y Desplazar activo, arrastrar y verificar que la ventana se
mueve (con clamp a los extremos) y las métricas se actualizan.

**Acceptance Scenarios**:

1. **Given** la herramienta Zoom activa, **When** el usuario arrastra horizontalmente sobre
   el gráfico, **Then** el cursor toma forma de lupa, la selección abarca todo el eje Y
   (sin importar la posición vertical del cursor) y define el rango en el eje X, y al soltar
   el botón la vista se acerca a ese rango de tiempo.
2. **Given** un gráfico con zoom aplicado, **When** el usuario usa "Restablecer zoom",
   **Then** la vista vuelve a mostrar la señal completa.
3. **Given** un gráfico ampliado con la herramienta Desplazar activa, **When** el usuario
   arrastra horizontalmente, **Then** la ventana visible se mueve conservando su ancho, sin
   pasarse de los límites de la señal, y las métricas se recalculan para el nuevo rango.

---

### User Story 4 - Filtrar la señal y poder revertir (Priority: P2)

La señal capturada suele ser ruidosa. El usuario aplica un filtro digital (pasa bajo, pasa
alto, pasa banda o notch) con sus parámetros de frecuencia de corte desde la pantalla
principal, y el gráfico se actualiza con la señal filtrada. Si el resultado no le sirve,
puede revertir exactamente a la señal original cargada.

**Why this priority**: Mejora la legibilidad y la fiabilidad de las métricas (picos R sobre
señal limpia). Importante para el uso real, pero el MVP entrega valor mostrando la señal
cruda.

**Independent Test**: Aplicar un filtro y verificar que el gráfico se actualiza en la misma
pantalla; luego revertir y verificar que la señal vuelve exactamente a la original.

**Acceptance Scenarios**:

1. **Given** un gráfico cargado, **When** el usuario aplica un filtro (pasa bajo, pasa alto,
   pasa banda o notch) con sus frecuencias de corte, **Then** el gráfico se actualiza
   mostrando la señal filtrada sin salir de la pantalla principal.
2. **Given** un filtro aplicado, **When** el usuario decide revertir, **Then** la señal
   vuelve exactamente a la original cargada.

---

### User Story 5 - Medir y recortar con el mouse (Priority: P2)

El usuario mide diferencias de tiempo y amplitud entre dos puntos sin alterar la señal
(herramienta Regla) y, cuando lo necesita, acota la señal a un rango temporal de interés
(herramienta Recorte), siempre con confirmación previa antes de aplicar el recorte.

**Why this priority**: Las mediciones asistidas y el recorte son parte del análisis, pero
son secundarias frente a ver la señal y sus métricas.

**Independent Test**: Con Regla activa, arrastrar y verificar que se muestran Δt y Δamplitud
en tiempo real y que la señal no cambia; con Recorte activo, seleccionar un rango, confirmar
y verificar que se genera una señal acotada, o cancelar y verificar que queda intacta.

**Acceptance Scenarios**:

1. **Given** la herramienta Regla activa, **When** el usuario arrastra el mouse sobre el
   gráfico, **Then** el cursor toma forma de regla, se traza la recta del recorrido y un
   **recuadro que la circunscribe** (ancho = Δt, alto = Δamplitud), y se muestran en tiempo
   real Δt (s) y Δamplitud (mV) entre el punto inicial y la posición del cursor; al soltar el
   botón la medición (recta y recuadro) desaparece y la señal no se altera.
2. **Given** la herramienta Recorte activa, **When** el usuario arrastra horizontalmente,
   **Then** el cursor toma forma de tijera, la selección abarca todo el eje Y y define el
   rango en el eje X, y se resalta la región a conservar sin alterar todavía la señal.
3. **Given** un rango de recorte seleccionado, **When** el sistema pide confirmación
   mediante un cartel, **Then** si el usuario acepta la señal se recorta a ese rango
   (generando una nueva señal acotada) y si cancela la señal permanece intacta.

---

### User Story 6 - Marcar eventos sobre el gráfico (Priority: P3)

El usuario anota instantes relevantes de la señal (artefactos, arritmias, anomalías)
creando marcadores anclados al eje temporal, y puede editar su etiqueta o eliminarlos.

**Why this priority**: Aporta valor documental y de análisis, pero es prescindible para el
MVP de visualización y métricas.

**Independent Test**: Crear un marcador con clic sobre el gráfico, editar su etiqueta y
luego eliminarlo, verificando cada cambio reflejado en el gráfico durante la sesión.

**Acceptance Scenarios**:

1. **Given** un gráfico cargado con la herramienta Marcar activa, **When** el usuario hace
   clic sobre un punto del eje temporal, **Then** se muestra un popup que pide el texto del
   marcador (máximo 255 caracteres).
2. **Given** el popup de texto abierto, **When** el usuario cancela, **Then** no se crea el
   marcador; **When** el usuario acepta, **Then** se crea el marcador de evento anclado a ese
   instante, visible y persistente mientras dure la sesión de trabajo.
3. **Given** un marcador cuyo texto supera los 10 caracteres, **When** se dibuja su etiqueta
   sobre el gráfico, **Then** se muestran solo los primeros 8 caracteres seguidos de "..."
   (el texto completo se conserva y se ve en el panel de marcadores).
4. **Given** un evento ya marcado, **When** el usuario edita su etiqueta o comentario,
   **Then** el cambio queda reflejado en el marcador.
5. **Given** un evento ya marcado, **When** el usuario elige eliminarlo, **Then** el
   marcador desaparece del gráfico.

---

### User Story 7 - Importar y exportar en Excel (Priority: P3)

El usuario intercambia señales con herramientas de hoja de cálculo: exporta la señal cargada
a un archivo Excel (.xlsx) e importa señales desde .xlsx con la estructura esperada.

**Why this priority**: Facilita el flujo de trabajo, pero el uso principal se cubre con la
carga CSV. Es una conveniencia de interoperabilidad.

**Independent Test**: Exportar una señal a .xlsx y reimportarla, verificando que los valores
de tiempo y señal se conservan; importar un .xlsx con estructura inválida y verificar que se
rechaza con un mensaje de error.

**Acceptance Scenarios**:

1. **Given** una señal cargada, **When** el usuario exporta a .xlsx, **Then** se genera un
   archivo válido que, al reabrirse o reimportarse, conserva los valores de tiempo y señal
   originales.
2. **Given** un archivo .xlsx con la estructura esperada, **When** el usuario lo importa,
   **Then** el sistema carga y grafica los datos igual que con un CSV válido; si la
   estructura no es la esperada, se rechaza con un mensaje de error.

---

### User Story 8 - Guardar explícitamente y proteger cambios sin guardar (Priority: P2)

El usuario controla cuándo se persiste su trabajo: los marcadores, filtros y recortes solo
se guardan cuando presiona "Guardar". Si intenta cerrar o recargar con cambios pendientes,
el sistema lo alerta y pide confirmación para no perder trabajo por accidente.

**Why this priority**: Es una garantía transversal de integridad del trabajo del usuario y
un principio del proyecto; aplica en cuanto existe algo que guardar (marcadores, filtros,
recortes).

**Independent Test**: Aplicar cambios sin guardar y verificar que no persisten tras cerrar;
presionar "Guardar" y verificar que recién entonces persisten; intentar cerrar con cambios
pendientes y verificar la alerta de confirmación.

**Acceptance Scenarios**:

1. **Given** un gráfico con cambios pendientes (marcadores, filtros o recortes), **When** el
   usuario presiona explícitamente "Guardar", **Then** recién en ese momento los cambios
   quedan persistidos.
2. **Given** un gráfico con marcadores, filtros o recortes aplicados, **When** el usuario
   cierra o recarga sin haber presionado "Guardar", **Then** los cambios no se persisten y
   se pierden (comportamiento esperado).
3. **Given** un gráfico con cambios pendientes, **When** el usuario intenta cerrar o
   recargar, **Then** el sistema lo alerta y pide confirmación antes de descartar los
   cambios.

---

### Edge Cases

- **Archivo vacío o solo con encabezado**: se rechaza con un mensaje de error y no se dibuja
  ninguna señal.
- **Archivo multicanal (CSV o XLSX)**: se informa que solo se soporta un canal y no se
  procesa.
- **Valores no numéricos o encabezado incorrecto**: se rechaza con un mensaje de error.
- **Ventana visible sin suficientes latidos para calcular HRV** (p. ej. menos de dos picos R
  detectables): las métricas no calculables (SDNN, RMSSD, pNN50, y BPM si no hay al menos un
  intervalo RR) se muestran como "no disponible" ("—"), nunca como 0, y el panel permanece
  visible.
- **Revertir un filtro después de un recorte, o recortar sobre una señal filtrada**: la
  reversión de filtro devuelve la señal (recortada) sin el filtro; el recorte no impide
  revertir el filtro sobre el tramo conservado.
- **Recorte cancelado**: la señal permanece exactamente como estaba.
- **Cierre/recarga sin cambios pendientes**: no se muestra ninguna alerta.
- **Señal de referencia de 1 minuto**: sirve de referencia para los umbrales de rendimiento
  de render y de cálculo de métricas.
- **Rejilla a bajo nivel de zoom**: cuando la separación entre líneas de un nivel cae por debajo
  del mínimo legible (≥ 4 px), ese nivel deja de dibujarse (primero las subdivisiones finas de
  1 mm, luego las gruesas de 5 mm) para evitar el "borrón" y preservar el rendimiento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (RF-01): El sistema MUST permitir cargar una señal ECG de un solo canal desde
  un archivo CSV cuya primera línea sea un encabezado con columnas de tiempo y valor.
- **FR-002** (RF-01): El sistema MUST rechazar, con un mensaje de error y sin cargar señal,
  archivos con formato inválido (columnas faltantes, valores no numéricos o encabezado
  incorrecto) y archivos con más de un canal (informando que solo soporta un canal).
- **FR-003** (RF-02): El sistema MUST visualizar la señal cargada en un gráfico principal con
  el tiempo en el eje X (en segundos) y la amplitud en el eje Y (en mV), respetando el orden
  temporal del archivo. Cada eje MUST mostrar una **escala numérica visible**: marcas de tick
  con sus valores (en s en el eje X, en mV en el eje Y) y el rótulo de la unidad. Los valores de
  tick se recalculan al cambiar la ventana visible (zoom/desplazamiento).
- **FR-004** (RF-07): El sistema MUST permitir mostrar u ocultar una rejilla ECG sobre el
  gráfico, reproduciendo el papel milimetrado clásico con dos niveles de líneas: subdivisiones
  finas cada 1 mm y divisiones gruesas cada 5 mm pintadas encima. Las escalas son clínicas:
  eje Y con ganancia fija de 10 mm/mV (1 mm = 0.1 mV; cuadro grande de 5 mm = 0.5 mV) y eje X
  según la velocidad de papel seleccionada (ver FR-022). La rejilla se ancla a valores absolutos
  de tiempo/amplitud (no al borde del gráfico), de modo que las líneas permanecen fijas respecto
  a la señal al hacer zoom o desplazamiento. Por rendimiento (RNF-01/02), cada nivel de líneas
  solo se dibuja si su separación en pantalla es ≥ 4 px: al alejar el zoom, las subdivisiones
  finas dejan de pintarse antes de amontonarse.
- **FR-022** (RF-07): El sistema MUST permitir seleccionar la velocidad de papel que fija la
  escala temporal del eje X de la rejilla: 25 mm/s (por defecto; 1 mm = 0.04 s, cuadro grande =
  0.2 s) o 50 mm/s (1 mm = 0.02 s, cuadro grande = 0.1 s). El paso de la rejilla en X se ajusta
  a la velocidad elegida.
- **FR-005** (RF-06): El sistema MUST permitir, con la herramienta Zoom activa, acercar un
  rango del eje temporal seleccionándolo con arrastre horizontal del mouse (la selección
  abarca todo el eje Y) y restablecer el zoom a la señal completa.
- **FR-023** (RF-06): El sistema MUST permitir, con la herramienta Desplazar (pan) activa,
  desplazar horizontalmente la ventana visible arrastrando el mouse cuando el zoom no muestra
  la señal completa, conservando el ancho de la ventana y sin salir de los límites de la señal.
  El desplazamiento cambia la ventana visible, por lo que las métricas (FR-006) se recalculan
  para el nuevo rango.
- **FR-006** (RF-14): El sistema MUST calcular y mostrar las métricas cardíacas (BPM, SDNN,
  RMSSD, pNN50) exclusivamente sobre la ventana de tiempo visible en el gráfico, y
  recalcularlas cuando cambia el rango visible. Cuando la ventana no tiene latidos suficientes
  para una métrica, el sistema MUST mostrarla como "no disponible" ("—") y no como 0,
  manteniendo el panel visible.
- **FR-007** (RF-10): El sistema MUST permitir aplicar un filtro digital (pasa bajo, pasa
  alto, pasa banda o notch), con sus frecuencias de corte, a la señal desde la pantalla
  principal, actualizando el gráfico sin cambiar de pantalla.
- **FR-008** (RF-11): El sistema MUST permitir revertir la señal filtrada exactamente a la
  señal original cargada.
- **FR-009** (RF-08): El sistema MUST permitir, con la herramienta Regla activa, medir con el
  mouse Δt (s) y Δamplitud (mV) entre el punto donde se presiona y la posición del cursor,
  en tiempo real y sin modificar la señal. Además de la recta del recorrido del mouse, el
  sistema MUST mostrar un **recuadro que la circunscribe** (ancho = Δt, alto = Δamplitud) para
  que el usuario visualice el área seleccionada. La recta y el recuadro desaparecen al soltar.
- **FR-010** (RF-09): El sistema MUST permitir, con la herramienta Recorte activa,
  seleccionar con el mouse un rango del eje temporal, resaltar la región a conservar y, solo
  tras confirmación explícita del usuario, recortar la señal a ese rango generando una nueva
  señal acotada; si el usuario cancela, la señal permanece intacta.
- **FR-011** (RF-03): El sistema MUST permitir crear un marcador de evento anclado a un
  instante del eje temporal del gráfico.
- **FR-012** (RF-04): El sistema MUST permitir editar la etiqueta o comentario de un marcador
  de evento existente.
- **FR-013** (RF-05): El sistema MUST permitir eliminar un marcador de evento existente.
- **FR-014** (RF-12): El sistema MUST permitir exportar la señal cargada a un archivo Excel
  (.xlsx) que conserve los valores de tiempo y señal.
- **FR-015** (RF-13): El sistema MUST permitir importar una señal desde un archivo Excel
  (.xlsx) con la estructura esperada, graficándola igual que un CSV válido, y rechazar con
  mensaje de error los .xlsx con estructura inesperada o multicanal.
- **FR-016** (RF-15): El sistema MUST persistir los cambios (marcadores, filtros, recortes)
  únicamente cuando el usuario lo solicita explícitamente con la acción "Guardar".
- **FR-017** (RNF-05): El sistema MUST NOT guardar automáticamente ningún cambio del gráfico
  o de la información; la persistencia ocurre solo por acción explícita del usuario.
- **FR-018** (RNF-06): El sistema MUST alertar al usuario y pedir confirmación antes de
  cerrar o recargar cuando existan cambios sin guardar.
- **FR-019**: El sistema MUST poder revertir de forma no destructiva las operaciones de
  filtrado y recorte a la señal originalmente cargada (la fuente en memoria no se altera de
  manera irreversible).
- **FR-020**: El sistema MUST ser una aplicación de libre acceso, sin inicio de sesión,
  cuentas de usuario, sesiones ni aislamiento de datos por usuario.
- **FR-021**: El sistema MUST mantener un único estudio guardado: "Guardar" reemplaza el
  estudio anterior y el usuario puede restaurar ese estudio (señal + marcadores + filtros +
  recortes). El sistema MUST NOT ofrecer una lista de estudios ni comparación entre estudios.

### Key Entities *(include if feature involves data)*

- **Señal ECG**: serie temporal de un solo canal compuesta por pares (tiempo en segundos,
  amplitud en mV) en orden temporal. Tiene una versión original cargada (inmutable) y una
  versión de trabajo derivada de filtros y recortes.
- **Ventana visible**: rango temporal `[fromTime, toTime]` mostrado actualmente en el
  gráfico tras zoom o desplazamiento; define el subconjunto de datos sobre el que se calculan
  las métricas.
- **Marcador de evento**: anotación anclada a un instante del eje temporal, con una etiqueta
  o comentario editable.
- **Filtro digital**: configuración de un filtro (tipo pasa bajo / pasa alto / pasa banda /
  notch y sus frecuencias de corte) aplicado a la señal de trabajo.
- **Recorte**: rango temporal seleccionado que, tras confirmación, produce una nueva señal
  acotada a partir de la señal de trabajo.
- **Métricas cardíacas**: conjunto de valores calculados sobre la ventana visible: BPM,
  SDNN, RMSSD y pNN50.
- **Estudio guardado**: único trabajo actual (señal cargada más marcadores, filtros y
  recortes) que el usuario persiste explícitamente con "Guardar" y puede restaurar. Existe un
  solo estudio a la vez: guardar reemplaza al anterior; no hay lista de estudios ni
  comparación entre estudios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario ve la señal completa dibujada en menos de 0.1 s en el percentil 95
  (sobre 20 mediciones) tomando como referencia un archivo de 1 minuto de señal.
- **SC-002**: Las métricas (BPM, SDNN, RMSSD, pNN50) se calculan y muestran en menos de
  0.1 s en el percentil 95 (sobre 20 mediciones) para el archivo de referencia de 1 minuto.
- **SC-003**: Al interactuar con el gráfico (zoom, filtro, arrastre del mouse o nuevo dato),
  la experiencia se mantiene fluida a 10 fps o más (cada cuadro en menos de 100 ms) sin
  redibujos completos perceptibles.
- **SC-004**: Las métricas mostradas corresponden exclusivamente a la ventana de tiempo
  visible y se actualizan al cambiar el rango, verificable comparando dos ventanas distintas
  de la misma señal.
- **SC-005**: Ningún cambio (marcador, filtro o recorte) se conserva tras cerrar o recargar
  a menos que el usuario haya presionado "Guardar"; el 100 % de los intentos de cierre con
  cambios pendientes muestra una alerta de confirmación.
- **SC-006**: Un archivo exportado a .xlsx y luego reimportado conserva los valores de tiempo
  y señal originales sin pérdida perceptible.
- **SC-007**: El 100 % de los archivos inválidos o multicanal se rechazan con un mensaje de
  error y sin dibujar señal.
- **SC-008**: Las operaciones básicas (carga, zoom, filtro, marcado) funcionan sin errores de
  compatibilidad en las últimas 2 versiones estables de Chrome, Firefox y Edge en escritorio,
  y de Chrome en Android y Safari en iOS.
- **SC-009**: Tras revertir un filtro, la señal coincide exactamente con la original cargada.

## Assumptions

- La aplicación es de **libre acceso**: sin autenticación, cuentas, sesiones ni datos por
  usuario. Los estudios guardados se persisten localmente, no en la nube.
- Las herramientas de **zoom, regla y recorte** se operan con el **mouse** sobre el gráfico,
  con un cursor propio por herramienta (lupa, regla, tijera).
- La **rejilla ECG** usa escalas clínicas estándar: ganancia fija de **10 mm/mV** en el eje Y y
  **velocidad de papel** seleccionable (**25 mm/s** por defecto o **50 mm/s**) para el eje X.
- Solo se soporta **un canal** por archivo; los archivos multicanal se informan y no se
  procesan.
- El **archivo de referencia** para los umbrales de rendimiento es una señal de 1 minuto.
- ECGViewer **no es una herramienta de diagnóstico clínico certificado** y no sustituye
  equipamiento médico homologado.
- Quedan **fuera de alcance**: captura en tiempo real por hardware, espacios de filtrado
  separados del gráfico principal, export a firmware/simulación (Proteus, tablas C, EDF,
  WFDB), integración con HL7/DICOM/HL7-aECG, almacenamiento en la nube y multi-tenancy,
  accesibilidad/WCAG, sparklines o gráficos estadísticos decorativos en el panel de métricas,
  soporte multicanal, y la gestión de múltiples estudios guardados o su comparación (solo hay
  un único estudio restaurable a la vez).
- Para métricas confiables sobre señal ruidosa se asume que el usuario puede filtrar antes de
  interpretar la variabilidad; con muy pocos latidos en la ventana, las métricas de HRV se
  muestran como no disponibles.
