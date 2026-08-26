# Implementation Plan: Conexión al hardware del ECG por puerto serie

**Branch**: `005-conexion-hardware-ecg` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-conexion-hardware-ecg/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Nueva sección "Conectarse" en la sidebar (botones "Configuración" y
"Conectarse"/"Desconectarse"). El **frontend** abre el puerto serie elegido
con la Web Serial API del navegador (`navigator.serial`) — el backend no
participa: corre en un contenedor, sin acceso al hardware físico de quien usa
la app. El hook `useSerialConnection` lee enteros línea por línea, los escala
a mV (`cuenta × 10/4095`) y los numera a 250 Hz (`t = n/250`), volcándolos al
estado en lotes de ~100 ms. Conectar reemplaza cualquier señal cargada (como
abrir un archivo nuevo); mientras dura la conexión, la ventana visible sigue
el extremo más reciente (monitor en vivo); la sesión se corta sola a los 20
minutos (300 000 muestras). Al detener, lo capturado queda disponible para el
resto de la app (filtros, espectro, complejos, guardar) igual que una señal
de archivo.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19.2, Vite 6). Esta feature vive
**enteramente en el frontend**; el backend (.NET 10) no se toca.

**Primary Dependencies**: Ninguna nueva. `navigator.serial` (Web Serial API)
es nativo del navegador (research.md D1) — sin librería adicional.

**Storage**: N/A para la configuración de conexión (research.md/data-model.md:
`SerialConnectionConfig` no se persiste). La señal ya capturada, una vez
detenida la conexión, se guarda igual que cualquier otra (`StudyRepository`
existente, sin cambios).

**Testing**: Vitest/RTL (frontend: hook + diálogo + sidebar + `MainPage`, con
un `SerialPortLike`/`NavigatorSerialLike` simulados — nunca hardware real ni
`navigator.serial` real, que no existe en jsdom).

**Target Platform**: Requiere un navegador con Web Serial API (Chrome/Edge/
Opera) y contexto seguro (HTTPS o `localhost`); Firefox/Safari no soportan la
conexión (research.md D1) — el resto de la app funciona igual en cualquier
navegador. No depende de que backend y hardware compartan máquina: el backend
puede correr en un contenedor remoto sin afectar esta feature.

**Project Type**: Web application existente; esta feature toca solo `src/frontend`.

**Performance Goals**: FR-012/Constitución v1.4.0 — actualización visual con
demora ≤100 ms durante la captura en vivo.

**Constraints**: Principio II (la señal capturada, una vez formada, es
inmutable como cualquier otra); Principio III (nada se persiste solo — ni la
config de conexión ni la señal en curso — hasta que el usuario presione
Guardar); límite duro de 20 min / 300 000 muestras (FR-013); una sola conexión
activa a la vez (research.md D9).

**Scale/Scope**: Sesiones de hasta 300 000 muestras (un solo canal), mismo
orden de magnitud que archivos ya soportados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|---|---|
| I. Test-First (NO-NEGOCIABLE) | **Aplica de lleno**: nuevo hook/diálogo/sección de sidebar son cambio de comportamiento → TDD obligatorio, con el puerto serie siempre simulado en tests (`SerialPortLike`/`NavigatorSerialLike` falsos — nunca hardware real ni `navigator.serial` real). **PASS**. |
| II. Integridad de la Señal Original | Una vez que una muestra entra a la señal en curso, no se modifica salvo por los mecanismos ya existentes (filtro/recorte, no destructivos). **PASS**. |
| III. Persistencia Explícita | La config de conexión y la señal en curso NUNCA se persisten solas; "Guardar" sigue siendo el único gatillo, igual que hoy. **PASS**. |
| IV. Métricas sobre la Ventana Visible | Sin cambios: las métricas siguen calculándose sobre la ventana visible, que durante la conexión es la que sigue el extremo más reciente (research.md D8) — sigue siendo "la ventana visible", no toda la señal. **PASS**. |
| V. Rendimiento de Visualización | Cubierto por la enmienda v1.4.0: actualización ≤100 ms durante captura en vivo (distinto del render estático de <0.1 s/1 min, que sigue vigente para el trazado ya cargado). El redibujo del trazado sigue acotado a la ventana visible sin importar cuánto creció la señal total (mismo mecanismo de `drawSignal` ya existente). **PASS**. |

No hay violaciones que requieran la tabla de Complexity Tracking (la
excepción de alcance ya se resolvió con la enmienda de la constitución, no
acá).

## Project Structure

### Documentation (this feature)

```text
specs/005-conexion-hardware-ecg/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── contracts/
│   └── api.md           # Phase 1: no hay endpoints — interfaz del hook (frontend-only)
├── quickstart.md        # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Esta feature toca **solo `src/frontend`** — el backend no tiene ningún
archivo nuevo ni modificado (research.md D1).

```text
src/frontend/src/
├── signal/
│   ├── sampleScaling.ts             # NUEVO: cuenta → mV (Span/Zero), pura y testeable
│   └── sampleScaling.test.ts        # NUEVO
├── serial/
│   └── webSerialTypes.ts            # NUEVO: SerialPortLike/NavigatorSerialLike (interfaz propia, inyectable)
├── hooks/
│   ├── useSerialConnection.ts       # NUEVO: abre el puerto, lee el stream, acumula muestras en lotes
│   ├── useSerialConnection.test.ts  # NUEVO
│   └── useVisibleWindow.ts          # MODIFICADO: modo autoseguimiento durante la conexión (research.md D8)
├── components/
│   ├── SerialConfigDialog.tsx       # NUEVO: requestPort() + baudios (default 115200)
│   ├── SerialConfigDialog.test.tsx  # NUEVO
│   └── layout/
│       ├── Sidebar.tsx              # MODIFICADO: sección "Conectarse" (Configuración/Conectarse/Desconectarse)
│       └── Sidebar.test.tsx         # MODIFICADO
└── pages/
    ├── MainPage.tsx                  # MODIFICADO: reemplaza la señal al conectar, wiring del hook
    └── MainPage.test.tsx             # MODIFICADO
```

**Structure Decision**: Mismo patrón que otras features del frontend (un
hook de estado + un componente de UI nuevo), pero sin cliente de API porque
no hay backend involucrado. `serial/webSerialTypes.ts` sigue el mismo criterio
que el Worker inyectable de la feature 003 y el `EventSource` inyectable que
tuvo esta misma feature en su primera versión: una interfaz propia mínima,
reemplazable por una falsa en tests.

## Complexity Tracking

No aplica — el Constitution Check no encontró violaciones que justificar.
