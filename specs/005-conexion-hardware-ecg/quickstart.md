# Quickstart: Conexión al hardware del ECG por puerto serie

Guía de validación manual end-to-end. Requiere el flujo mínimo del proyecto
levantado (ver `AGENTS.md` → "Cómo correr").

## Prerrequisitos

```bash
cd src/backend && dotnet run --project ECGViewer.Api
cd src/frontend && npm install && npm run dev
```

Para probar sin un dispositivo real, usar un simulador de puerto serie (p. ej.
un puerto virtual `socat`/`com0com` que escriba una línea con un entero cada
4 ms) o mockear `System.IO.Ports.SerialPort` en los tests automatizados
(ver Verificación automatizada).

## Escenario 1 — Configurar el puerto y la velocidad (US1)

1. Abrir la sidebar → sección "Conectarse" → "Configuración".
2. **Esperado**: se ve la lista de puertos disponibles y **115200 baudios**
   preseleccionado (FR-002/003).
3. Elegir un puerto y confirmar.

## Escenario 2 — Conectarse y ver el trazado en vivo (US2)

1. Con un puerto configurado, presionar "Conectarse".
2. Enviar por el puerto (real o simulado) enteros, uno por línea (p. ej. `2048`).
3. **Esperado**: el trazado muestra ~5 mV por cada `2048` recibido (FR-006), la
   ventana visible sigue mostrando lo último recibido (research.md D8), y la
   actualización se percibe fluida (≤100 ms, FR-012).
4. Enviar una línea no numérica (p. ej. texto vacío o basura).
5. **Esperado**: se descarta sin cortar la conexión (FR-008).
6. Desconectar el cable/simulador a mitad de captura.
7. **Esperado**: la app informa la pérdida de conexión (FR-009) en vez de
   quedar esperando en silencio.

## Escenario 3 — Detener y reutilizar lo capturado (US3)

1. Con datos ya recibidos, presionar "Desconectarse".
2. **Esperado**: el puerto se cierra; el trazado capturado queda visible y ya
   no sigue el extremo más reciente (autoseguimiento apagado).
3. Aplicar un filtro, ver el espectro, agregar un marcador y presionar
   "Guardar".
4. **Esperado**: todo funciona igual que sobre una señal cargada por archivo
   (FR-010/SC-004).

## Escenario 4 — Límite de 20 minutos (FR-013)

1. Mantener una conexión activa el tiempo suficiente (o, en pruebas
   automatizadas, simular 300 000 muestras).
2. **Esperado**: la conexión se detiene sola, con el mismo resultado que
   presionar "Desconectarse" — nada se pierde.

## Verificación automatizada

```bash
cd src/backend && dotnet test    # incluye los tests nuevos de /api/serial/*
cd src/frontend && npm test      # incluye los tests nuevos de sidebar/diálogo/hook
```

Los tests de backend NUNCA abren un puerto serie real: usan una abstracción
inyectable sobre `SerialPort` (fuente de líneas simulada) — mismo criterio que
"los tests nunca llaman a la API real de Claude" ya vigente en el proyecto.
