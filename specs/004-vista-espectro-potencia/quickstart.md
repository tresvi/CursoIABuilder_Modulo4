# Quickstart: Vista de espectro de potencia y limpieza de la sidebar

Guía de validación manual end-to-end. Requiere el flujo mínimo del proyecto levantado
(ver `AGENTS.md` → "Cómo correr"): backend en `http://localhost:5080` y frontend en
`http://localhost:5173`.

## Prerrequisitos

```bash
# Terminal 1
cd src/backend && dotnet run --project ECGViewer.Api

# Terminal 2
cd src/frontend && npm install && npm run dev
```

Abrir `http://localhost:5173`.

## Escenario 1 — Sidebar despejada (US2)

1. Cargar un ejemplo desde el estado vacío.
2. Abrir la sidebar y mirar la sección "Diagnósticos".
3. **Esperado**: solo aparecen "Detec. Complejos" y "Espectro" (FR-001/FR-002); ya no
   están "Pasa Bajo", "Pasa Alto", "Pasa Banda", "Notch" ni "Restaurar".
4. Ir al panel de filtro debajo del gráfico, elegir un tipo y presionar "Aplicar
   filtro".
5. **Esperado**: el filtro se aplica igual que siempre (sin cambios de comportamiento).
6. Presionar "Revertir" en el panel de filtro.
7. **Esperado**: la señal vuelve a la original, igual que siempre.

## Escenario 2 — Ver y alternar el espectro (US1)

1. Con una señal cargada, activar "Espectro".
2. **Esperado**: el gráfico principal muestra el espectro de potencia (frecuencia vs.
   potencia) de la ventana visible en vez del trazado (FR-003).
3. Desactivar "Espectro".
4. **Esperado**: vuelve a mostrarse el trazado ECG tal como estaba (FR-004).

## Escenario 3 — Recalculo automático al filtrar (US1, FR-005)

1. Activar "Espectro".
2. Aplicar un filtro desde el panel de filtro (por ejemplo, Pasa Banda).
3. **Esperado**: el espectro se recalcula solo, reflejando la señal filtrada, sin
   reactivar la herramienta.

## Escenario 4 — Complejos y herramientas mientras se ve el espectro (FR-006/FR-007)

1. Activar "Detec. Complejos" y luego "Espectro".
2. **Esperado**: no se ve ninguna marca de complejos sobre el espectro.
3. Desactivar "Espectro" (volviendo al trazado).
4. **Esperado**: las marcas de complejos reaparecen solas, sin reactivar
   "Detec. Complejos".
5. Con "Espectro" activo, intentar usar Zoom/Regla/Recortar/Marcar.
6. **Esperado**: no tienen efecto sobre el gráfico de espectro.

## Escenario 5 — Ventana insuficiente (FR-009)

1. Cargar una señal muy corta o hacer zoom a una ventana con muy pocas muestras.
2. Activar "Espectro".
3. **Esperado**: se muestra un aviso (`role="alert"`) en vez de un gráfico de espectro
   vacío o engañoso.

## Verificación automatizada

```bash
cd src/frontend && npm test      # incluye los tests nuevos de sidebar/espectro/MainPage
cd src/backend && dotnet test    # incluye los tests nuevos de /api/spectrum
```
