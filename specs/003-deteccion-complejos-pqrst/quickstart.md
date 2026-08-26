# Quickstart: Detección y marcado de complejos PQRST

Guía de validación manual end-to-end. Requiere el flujo mínimo del proyecto
levantado (ver `AGENTS.md` → "Cómo correr"): backend en `http://localhost:5080` y
frontend en `http://localhost:5173`.

## Prerrequisitos

```bash
# Terminal 1
cd src/backend && dotnet run --project ECGViewer.Api

# Terminal 2
cd src/frontend && npm install && npm run dev
```

Abrir `http://localhost:5173`.

## Escenario 1 — Ver la sección renombrada y marcar complejos (US1)

1. Cargar un ejemplo desde el estado vacío ("Cargar ejemplo").
2. En la barra lateral, confirmar que la sección antes llamada "Filtros" ahora se
   llama **"Diagnósticos"**, y que su primer botón es **"Detec. Complejos"**
   (FR-001/FR-002).
3. Activar "Detec. Complejos".
4. **Esperado**: sobre el trazado aparecen marcas puntuales en los 5 puntos (P, Q,
   R, S, T) de cada latido visible, visualmente distintas de los marcadores
   manuales (FR-004/FR-011).
5. Hacer zoom y desplazar (pan) hacia otra parte de la señal.
6. **Esperado**: las marcas siguen apareciendo, correctamente ubicadas, sobre los
   latidos de la nueva porción visible (FR-005).

## Escenario 2 — Apagar sin alterar la señal, y recalcular al filtrar (US2)

1. Con "Detec. Complejos" activo y marcas visibles, anotar los valores de
   BPM/SDNN/RMSSD/pNN50 del panel de métricas.
2. Desactivar "Detec. Complejos".
3. **Esperado**: las marcas desaparecen; los valores de métricas no cambiaron
   (FR-006, SC-003).
4. Reactivar "Detec. Complejos" y aplicar un filtro (por ejemplo, Pasa Banda).
5. **Esperado**: las marcas se recalculan solas sobre la señal filtrada, sin que
   haga falta reactivar la herramienta a mano (FR-007).
6. Restaurar el filtro (volver a la señal original) con "Detec. Complejos" activo.
7. **Esperado**: las marcas se recalculan otra vez sobre la señal original.

## Escenario 3 — Aviso de baja confianza (US3)

1. Cargar (o editar a mano) un CSV con ruido puro o una línea plana, sin latidos
   reconocibles.
2. Activar "Detec. Complejos".
3. **Esperado**: no aparecen marcas arbitrarias; se muestra un aviso indicando que
   no se pudo detectar con confianza (FR-008, SC-004).

## Escenario 4 — Señal más larga que el archivo de referencia (Clarification 2026-08-26)

1. Cargar una señal notablemente más larga que 1 minuto.
2. Activar "Detec. Complejos".
3. **Esperado**: el botón muestra un estado de "procesando" mientras calcula, sin
   bloquear el resto de la interfaz (se puede seguir interactuando con el resto de
   la app), y finalmente muestra las marcas o el aviso correspondiente (FR-012).

## Verificación automatizada

```bash
cd src/frontend && npm test      # incluye los tests nuevos de detección/dibujo/UI
cd src/backend && dotnet test    # sin cambios esperados (feature 100% frontend)
```
