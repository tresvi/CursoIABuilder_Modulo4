# Phase 0 — Research: ECGViewer

Consolidación de decisiones técnicas. El stack base viene fijado por `AGENTS.md` y la
constitución (React 19.2 + TS / .NET 10 / SQLite), por lo que no quedan marcadores
NEEDS CLARIFICATION abiertos. Este documento resuelve el "cómo" de los puntos con más de una
alternativa razonable.

## D1 — Motor de renderizado del gráfico

- **Decision**: Canvas 2D nativo con **doble capa**: un `<canvas>` base (señal + ejes + rejilla
  ECG) y un `<canvas>` superpuesto (overlay) para la interacción del mouse (selección de zoom,
  regla, recorte, marcadores en curso).
- **Rationale**: RNF-01/02 exigen render < 0.1 s p95 para 1 minuto y actualización sin redibujo
  completo del lienzo a ≥ 10 fps. Separar la interacción en una capa superpuesta permite repintar
  solo el overlay durante el arrastre, dejando intacta la capa base. Las librerías de charting
  genéricas (Chart.js, Recharts, Plotly) hacen full-repaint y no garantizan el umbral.
- **Alternatives considered**: (a) SVG — descartado: miles de nodos DOM degradan a < 10 fps;
  (b) Chart.js/Recharts — descartado por full-repaint y peso; (c) WebGL — potente pero
  sobredimensionado para 1 canal 2D y complica testing; se reserva como escape hatch si el
  Canvas 2D no alcanzara el umbral en el archivo de referencia.

## D2 — Dónde se calculan las métricas HRV (BPM, SDNN, RMSSD, pNN50)

- **Decision**: En el **frontend (TypeScript)**, como módulo puro `metrics/`, tomando como
  entrada las muestras de la **ventana visible** de la señal de trabajo.
- **Rationale**: Las métricas se recalculan en cada cambio de ventana (zoom/pan). Un round-trip
  al backend por cada interacción rompería la fluidez (RNF-02) y SC-002 (< 0.1 s). Al ser
  funciones puras se testean con Vitest bajo TDD (Principio I) y respetan el Principio IV
  (ventana visible) por construcción: la ventana es un parámetro obligatorio.
- **Alternatives considered**: Cálculo en backend (.NET/xUnit) — más cómodo para tests de
  precisión, pero introduce latencia de red en una operación de alta frecuencia; descartado como
  ruta primaria. Nota: el archivo de referencia de 1 min servirá para validar el p95.

## D3 — Detección de picos R

- **Decision**: Detector basado en umbral adaptativo sobre la señal (opcionalmente filtrada),
  estilo Pan-Tompkins simplificado (derivada → cuadrado → ventana de integración → umbral
  adaptativo con refractario ~200 ms), implementado como función pura en `metrics/rPeakDetection`.
- **Rationale**: Es el mínimo robusto para obtener intervalos RR fiables sobre señal filtrada
  (mitigación del riesgo del PRD). Determinista y testeable contra señales sintéticas de RR
  conocido. Si hay < 2 picos en la ventana, las métricas HRV se reportan "no disponible" ("—")
  y BPM también si no hay al menos un intervalo RR (spec, FR-006).
- **Alternatives considered**: Umbral fijo — frágil ante variación de amplitud; wavelets/QRS
  avanzados — mayor exactitud pero coste y complejidad fuera del alcance educativo del MVP.

## D4 — Filtros DSP (pasa bajo / alto / banda / notch)

- **Decision**: En el **backend .NET** con **FftSharp**, expuestos vía `POST /api/filter`. La
  señal de trabajo se envía, se filtra y se devuelven las muestras filtradas; el frontend
  reemplaza la señal de trabajo y conserva el origen para revertir.
- **Rationale**: FftSharp es la dependencia designada (AGENTS.md/PRD) y el filtrado es una
  operación puntual (al aplicar filtro), no de alta frecuencia, por lo que el round-trip es
  aceptable. La corrección numérica se cubre con xUnit (Principio I). Cumple Principio II:
  operación no destructiva sobre el original.
- **Alternatives considered**: Filtrado en frontend (TS) — duplicaría lógica DSP y desaprovecharía
  FftSharp/xUnit; descartado. Aplicar filtro en cada zoom — innecesario; el filtro es explícito.

## D5 — Import/Export XLSX

- **Decision**: En el **backend** con **ClosedXML** (lectura/escritura de alto nivel) apoyado en
  **DocumentFormat.OpenXml**. `POST /api/import/xlsx` (multipart) devuelve la señal parseada;
  `POST /api/export/xlsx` recibe la señal y devuelve el archivo `.xlsx`.
- **Rationale**: Dependencias designadas; el manejo de OOXML en el navegador es frágil. El CSV,
  en cambio, se parsea en el **frontend** (texto simple) para carga inmediata. Import XLSX aplica
  las mismas validaciones que CSV (un canal, columnas tiempo/valor, numérico) — AC-17.
- **Alternatives considered**: Parseo XLSX en frontend con SheetJS — añade dependencia pesada y
  se aparta de las NuGet designadas; descartado.

## D6 — Persistencia del estudio único (SQLite)

- **Decision**: Una sola fila lógica de "estudio actual" en SQLite. `PUT /api/study` reemplaza el
  estudio (upsert); `GET /api/study` lo restaura; guarda señal (o referencia a sus muestras),
  marcadores, configuración de filtro y recorte. Sin lista de estudios ni comparación (FR-021).
- **Rationale**: El spec fija un único trabajo restaurable. Modelo mínimo, sin usuarios ni
  sesiones (libre acceso). "Guardar" es la única vía de persistencia (Principio III).
- **Alternatives considered**: Persistencia en `localStorage` del navegador — más simple pero la
  constitución/PRD fijan SQLite como store de estudios; descartado. Múltiples estudios — fuera
  de alcance explícito.

## D7 — Formato de señal y muestreo

- **Decision**: La señal es una serie de pares `(t_segundos, amplitud_mV)` en orden temporal.
  La frecuencia de muestreo `fs` se deriva del paso temporal (mediana de Δt) para el DSP y la
  detección de picos. Se asume muestreo aproximadamente uniforme.
- **Rationale**: FftSharp y el detector de picos necesitan `fs`. Derivarla del propio archivo
  evita pedir metadatos extra al usuario y respeta "respetar el orden temporal del archivo".
- **Alternatives considered**: Pedir `fs` al usuario — fricción innecesaria; asumir 250/500 Hz
  fijo — incorrecto ante archivos heterogéneos.

## D8 — Guardia de cambios sin guardar

- **Decision**: Estado `dirty` en el frontend que se activa ante cualquier cambio no persistido
  (marcador, filtro, recorte). Listener `beforeunload` que, con `dirty=true`, dispara la
  confirmación nativa del navegador; y confirmación in-app en flujos controlados.
- **Rationale**: Cumple FR-018/RNF-06 y Principio III con el mecanismo estándar del navegador,
  sin persistir nada automáticamente (FR-017).
- **Alternatives considered**: Autosave con opción de deshacer — contradice el Principio III;
  descartado.

## Resumen de resolución

Todas las decisiones necesarias para diseñar contratos y modelo de datos quedan resueltas; no
hay NEEDS CLARIFICATION pendientes. Se procede a la Fase 1.
