# Phase 1 — Data Model: ECGViewer

Entidades derivadas del spec (§ Key Entities) y de las decisiones de `research.md`. Notación:
tipos lógicos, no un esquema concreto de lenguaje. Las validaciones referencian los FR/AC.

## 1. Signal (Señal ECG)

Serie temporal monocanal.

| Campo | Tipo | Reglas / Notas |
|-------|------|----------------|
| `samples` | `Array<{ t: number; v: number }>` | `t` en segundos, `v` en mV, orden temporal creciente. No vacío. |
| `fs` | `number` (Hz) | Derivada de la mediana de Δt (D7). Solo lectura. |
| `durationSec` | `number` | `t` último − primero. Derivado. |

**Validaciones de carga (FR-001/FR-002, AC-01..03)**:
- Primera línea = encabezado con columnas de tiempo y valor.
- Todos los valores numéricos; sin columnas faltantes.
- Exactamente **un canal**: > 1 columna de valor ⇒ rechazo "solo soporta un canal", no procesa.
- Archivo vacío o solo encabezado ⇒ rechazo con mensaje, no dibuja.

**Relación de integridad (Principio II)**: existen dos instancias vivas:
- `originalSignal` — **inmutable**, la cargada (o restaurada). Nunca se sobrescribe.
- `workingSignal` — derivada; resultado de aplicar filtro y/o recorte sobre el original.

## 2. VisibleWindow (Ventana visible)

| Campo | Tipo | Reglas / Notas |
|-------|------|----------------|
| `fromTime` | `number` (s) | ≥ `originalSignal` inicio. |
| `toTime` | `number` (s) | ≤ fin; `fromTime < toTime`. |

- Define el subconjunto sobre el que se calculan **todas** las métricas (Principio IV, FR-006).
- "Restablecer zoom" ⇒ `[inicio, fin]` de la señal de trabajo (AC-09).
- Cambios de ventana disparan recálculo de métricas (AC-19).

## 3. EventMarker (Marcador de evento)

| Campo | Tipo | Reglas / Notas |
|-------|------|----------------|
| `id` | `string` | Único en la sesión. |
| `time` | `number` (s) | Instante anclado al eje temporal (FR-011, AC-05). |
| `label` | `string` | Editable (FR-012, AC-06). Puede estar vacío al crear. |

- Crear (clic con herramienta Marcar), editar etiqueta, eliminar (FR-011/012/013).
- Persisten en sesión; solo se guardan con "Guardar" (Principio III).

## 4. FilterConfig (Filtro digital)

| Campo | Tipo | Reglas / Notas |
|-------|------|----------------|
| `type` | `'lowpass' \| 'highpass' \| 'bandpass' \| 'notch'` | RF-010. |
| `cutoffLow` | `number` (Hz) | Requerido en highpass/bandpass/notch (borde inferior). |
| `cutoffHigh` | `number` (Hz) | Requerido en lowpass/bandpass/notch (borde superior). |

- Aplicar ⇒ `workingSignal` = filtrado del actual (FR-007, AC-14), sin salir de pantalla.
- **Revertir** ⇒ `workingSignal` vuelve exactamente al original conservado (FR-008/019, AC-15,
  SC-009). La reversión no destruye un recorte previo (edge case del spec): se revierte el filtro
  sobre el tramo conservado.

**Estado de aplicación**: `null` (sin filtro) o un `FilterConfig` activo.

## 5. Crop (Recorte)

| Campo | Tipo | Reglas / Notas |
|-------|------|----------------|
| `fromTime` | `number` (s) | Inicio del rango a conservar. |
| `toTime` | `number` (s) | Fin; `fromTime < toTime`. |
| `status` | `'pending' \| 'applied'` | `pending` = seleccionado, resaltado, **sin** confirmar. |

- Flujo (FR-010, AC-12/13, Principio III): seleccionar (pending, resalta región a conservar) →
  cartel de confirmación → si acepta, genera **nueva** `workingSignal` acotada (`applied`); si
  cancela, señal intacta. **Nunca** se recorta de inmediato.
- Reversible respecto del original (Principio II).

## 6. CardiacMetrics (Métricas cardíacas)

Calculadas **sobre la ventana visible**, nunca sobre todo el archivo (Principio IV).

| Campo | Tipo | Definición | "no disponible" cuando |
|-------|------|-----------|------------------------|
| `bpm` | `number \| null` | Frecuencia cardíaca (lpm) desde intervalos RR. | Sin ≥ 1 intervalo RR. |
| `sdnn` | `number \| null` (ms) | Desv. estándar de intervalos NN. | < 2 intervalos RR. |
| `rmssd` | `number \| null` (ms) | RMS de diferencias sucesivas RR. | < 2 intervalos RR. |
| `pnn50` | `number \| null` (%) | % de pares RR consecutivos con \|Δ\| > 50 ms. | < 2 intervalos RR. |

- `null` se muestra como "—", nunca como 0; el panel permanece visible (FR-006, edge case).
- Entrada: muestras de `workingSignal` dentro de `[fromTime, toTime]` + `fs` → picos R → RR.

## 7. SavedStudy (Estudio guardado)

Único trabajo persistible (FR-016/021). "Guardar" reemplaza al anterior (upsert).

| Campo | Tipo | Notas |
|-------|------|-------|
| `signal` | `Signal` | La señal **original** cargada (fuente para revertir). |
| `markers` | `EventMarker[]` | Marcadores de la sesión. |
| `filter` | `FilterConfig \| null` | Filtro activo a restaurar. |
| `crop` | `Crop \| null` | Recorte aplicado a restaurar (`status='applied'`). |
| `savedAt` | `datetime` | Timestamp de guardado. |

- Solo **un** estudio a la vez: sin lista ni comparación (FR-021).
- Restaurar (`GET /api/study`) reconstruye original + deriva working aplicando filter/crop.
- Persistencia solo por acción explícita (Principio III, FR-017).

## Estado transitorio del frontend (no persistido salvo "Guardar")

| Campo | Tipo | Notas |
|-------|------|-------|
| `activeTool` | `'none' \| 'zoom' \| 'ruler' \| 'crop' \| 'marker'` | Cursor propio por herramienta. |
| `showGrid` | `boolean` | Rejilla ECG on/off (FR-004, AC-10). |
| `paperSpeed` | `25 \| 50` (mm/s) | Velocidad de papel para la escala X de la rejilla (FR-022). Y usa ganancia fija 10 mm/mV. |
| `dirty` | `boolean` | Hay cambios sin guardar ⇒ guardia `beforeunload` (FR-018, D8). |
| `rulerMeasure` | `{ dt: number; dAmp: number } \| null` | Medición en vivo de la Regla (FR-009). |

## Diagrama de derivación de la señal

```text
originalSignal (inmutable)
      │  aplicar FilterConfig (backend FftSharp)         ── revertir ──▶ vuelve al original
      ▼
workingSignal ──── confirmar Crop ────▶ workingSignal' (acotada)
      │
      ▼  recorte por VisibleWindow (solo para métricas/vista)
   muestras visibles ─▶ rPeakDetection ─▶ intervalos RR ─▶ CardiacMetrics
```
