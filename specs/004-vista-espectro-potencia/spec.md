# Feature Specification: Vista de espectro de potencia y limpieza de la sidebar

**Feature Branch**: `004-vista-espectro-potencia`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "necesito que quites los filtros de la barra lateral y el boton restaurar. tambien agrega el boton \"Espectro\". El mismo cambiará el grafico de la señal ECG por el espectro de potencia de la señal"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el espectro de potencia de la señal (Priority: P1)

Como usuario que está analizando un ECG cargado, quiero activar un botón "Espectro" para
que el gráfico principal muestre el espectro de potencia de la señal en vez del trazado
tiempo/amplitud, y así poder inspeccionar el contenido en frecuencia de la señal (por
ejemplo, para detectar ruido de red o evaluar el efecto de un filtro).

**Why this priority**: Es el valor nuevo central de esta feature; sin él no hay nada que
entregar. La limpieza de la sidebar (US2) es independiente de esto.

**Independent Test**: Con una señal cargada, activar "Espectro" y verificar que el
gráfico muestra el espectro de potencia en vez del trazado; desactivarlo y verificar que
vuelve a mostrar el trazado.

**Acceptance Scenarios**:

1. **Given** una señal ECG cargada mostrando el trazado normal, **When** el usuario
   activa "Espectro", **Then** el gráfico principal muestra el espectro de potencia de
   la señal actualmente mostrada (original o filtrada) sobre la ventana de tiempo
   visible, en vez del trazado tiempo/amplitud.
2. **Given** "Espectro" activo, **When** el usuario lo desactiva, **Then** el gráfico
   principal vuelve a mostrar el trazado ECG tal como estaba antes de activarlo.
3. **Given** "Espectro" activo, **When** el usuario aplica, cambia o restaura un filtro
   de señal (desde el panel de filtro), **Then** el espectro se recalcula solo, sin que
   el usuario deba reactivar la herramienta.
4. **Given** "Espectro" activo con "Detec. Complejos" también activo, **When** se
   observa el gráfico, **Then** no se dibuja ninguna marca de complejos sobre el
   espectro (no tienen sentido en un eje de frecuencia); al desactivar "Espectro" y
   volver al trazado, las marcas reaparecen solas.

---

### User Story 2 - Sidebar despejada: solo diagnósticos, sin atajos de filtro (Priority: P2)

Como usuario, quiero que la sección "Diagnósticos" de la sidebar solo tenga las
herramientas de diagnóstico ("Detec. Complejos" y el nuevo "Espectro"), sin los botones
de filtro ni "Restaurar" que hoy la saturan, para que sea más simple de usar. Filtrar la
señal sigue siendo posible desde el panel de filtro debajo del gráfico, que ya tiene su
propio selector de tipo y sus propios botones de aplicar/revertir.

**Why this priority**: Es una mejora de orden/usabilidad, no bloquea el valor de US1; se
puede entregar por separado.

**Independent Test**: Abrir la sidebar y verificar que "Diagnósticos" solo lista
"Detec. Complejos" y "Espectro"; verificar que filtrar y revertir un filtro sigue
funcionando igual que antes desde el panel de filtro.

**Acceptance Scenarios**:

1. **Given** la sidebar abierta, **When** el usuario mira la sección "Diagnósticos",
   **Then** ya no ve los botones "Pasa Bajo", "Pasa Alto", "Pasa Banda", "Notch" ni
   "Restaurar".
2. **Given** una señal cargada, **When** el usuario aplica un filtro desde el panel de
   filtro debajo del gráfico, **Then** el filtro se aplica igual que antes (sin cambios
   de comportamiento, solo cambia dónde se dispara la acción).
3. **Given** un filtro aplicado, **When** el usuario lo revierte desde el botón
   "Revertir" del panel de filtro, **Then** la señal vuelve a la original, igual que
   antes.

### Edge Cases

- El usuario intenta activar "Espectro" sin ninguna señal cargada: el botón debe estar
  deshabilitado, igual que el resto de herramientas de diagnóstico.
- La ventana de tiempo visible tiene muy pocas muestras para un espectro con sentido: el
  sistema debe informarlo en vez de mostrar un gráfico vacío o engañoso.
- Con "Espectro" activo, el usuario intenta usar Zoom, Desplazar, Regla, Recortar o
  Marcar: estas herramientas están definidas en términos del eje temporal y no se
  aplican mientras se ve el espectro (ver FR-007); nada se pierde, solo no tienen efecto
  en esa vista.
- El usuario cambia la ventana visible (zoom/pan) estando en la vista de trazado y luego
  activa "Espectro": el espectro refleja esa ventana, no toda la señal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE quitar de la sidebar los botones de filtro de señal
  (Pasa Bajo, Pasa Alto, Pasa Banda, Notch) y el botón "Restaurar", sin eliminar la
  capacidad de aplicar o revertir un filtro, que sigue disponible en el panel de filtro
  debajo del gráfico (que ya tiene su propio selector de tipo y sus propios botones).
- **FR-002**: El sistema DEBE agregar un botón "Espectro" en la sección "Diagnósticos"
  de la sidebar, junto a "Detec. Complejos".
- **FR-003**: Al activar "Espectro" con una señal cargada, el gráfico principal DEBE
  mostrar el espectro de potencia de la señal actualmente mostrada (original o
  filtrada) sobre la ventana de tiempo visible, en vez del trazado tiempo/amplitud.
- **FR-004**: Al desactivar "Espectro", el gráfico principal DEBE volver a mostrar el
  trazado ECG tal como estaba.
- **FR-005**: El espectro DEBE recalcularse automáticamente cuando cambia la señal
  mostrada (se aplica, cambia o restaura un filtro) mientras "Espectro" está activo, sin
  que el usuario deba reactivar la herramienta.
- **FR-006**: Mientras se muestra el espectro, las marcas de complejos PQRST (si
  "Detec. Complejos" está activo) NO DEBEN dibujarse; DEBEN reaparecer automáticamente
  al volver al trazado, sin que el usuario deba reactivar "Detec. Complejos".
- **FR-007**: Mientras se muestra el espectro, las herramientas de interacción del
  gráfico (Zoom, Desplazar, Regla, Recortar, Marcar) NO DEBEN tener efecto, ya que están
  definidas en términos del eje temporal.
- **FR-008**: El botón "Espectro" DEBE estar deshabilitado cuando no hay ninguna señal
  cargada, de forma consistente con el resto de herramientas de diagnóstico.
- **FR-009**: Cuando la ventana de tiempo visible no tenga suficientes muestras para un
  espectro con sentido, el sistema DEBE informarlo en vez de mostrar un gráfico vacío o
  engañoso.
- **FR-010**: El espectro de potencia NUNCA se persiste como parte del estudio guardado;
  es siempre una vista derivada que se recalcula.

### Key Entities

- **Espectro de potencia**: representación derivada de la señal actualmente mostrada
  sobre la ventana de tiempo visible, como una serie de pares (frecuencia, potencia). No
  se persiste ni se guarda; se recalcula cada vez que se muestra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede alternar entre el trazado y el espectro con un solo
  click, y ver el cambio reflejado sobre el archivo de referencia de rendimiento de la
  app (1 minuto) sin demora perceptible.
- **SC-002**: La sección "Diagnósticos" de la sidebar pasa de 6 ítems a 3 (Detec.
  Complejos, Espectro, y ya no incluye los filtros ni Restaurar).
- **SC-003**: El 100% de las veces que la ventana visible no permite un espectro con
  sentido, el usuario ve un aviso en vez de un gráfico vacío o engañoso.
- **SC-004**: Aplicar y revertir un filtro de señal sigue siendo posible el 100% de las
  veces desde el panel de filtro, sin ninguna pérdida de funcionalidad respecto de antes
  de esta feature.

## Assumptions

- **"Quitar los filtros de la barra lateral"** se interpreta como quitar únicamente los
  atajos de selección de filtro y el botón "Restaurar" de la sidebar; la funcionalidad
  de filtrar/revertir sigue intacta a través del panel de filtro debajo del gráfico, que
  ya cuenta con su propio selector de tipo y sus propios botones "Aplicar filtro" /
  "Revertir". Si la intención era eliminar la funcionalidad de filtrado por completo
  (no solo sus atajos en la sidebar), esta es la principal suposición a corregir.
- El espectro se calcula sobre la **ventana de tiempo visible**, no sobre toda la señal
  cargada — mismo criterio que las métricas HRV existentes (Principio IV) — y se
  recalcula si el usuario cambia esa ventana desde la vista de trazado.
- "Espectro de potencia" se interpreta como la distribución de energía de la señal por
  frecuencia (comúnmente vía FFT, ya usada en el backend para los filtros); la unidad y
  escala exacta de los ejes queda como decisión de la fase de planificación técnica.
- Mientras se muestra el espectro, las herramientas de interacción (zoom/pan/regla/
  recorte/marcador) y las marcas de complejos quedan sin efecto/ocultas por estar
  definidas en términos del eje temporal; nada de eso se pierde, solo no aplica en esa
  vista puntual.
- El panel de métricas (BPM/SDNN/RMSSD/pNN50) sigue mostrándose sin cambios,
  independientemente de qué vista del gráfico esté activa.
- Se mantiene la restricción existente de un solo canal por señal; el espectro opera
  sobre esa misma señal monocanal.
