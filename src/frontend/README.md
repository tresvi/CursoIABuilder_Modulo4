# ECGViewer — Frontend

React 19.2 + TypeScript (Vite). Contiene lo interactivo y de baja latencia: parseo CSV,
render sobre Canvas de doble capa, cálculo de métricas HRV sobre la ventana visible, y las
herramientas de mouse (zoom, regla, recorte, marcadores).

## Scripts

```bash
npm install          # dependencias
npm run dev          # servidor de desarrollo → http://localhost:5173
npm run build        # build de producción (tsc + vite)
npm test             # tests unitarios (Vitest)
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format       # Prettier --write
```

Requiere el backend en `http://localhost:5080` para filtros (US4), XLSX (US7) y guardado (US8).
Configurable con `VITE_API_BASE` (ver `.env`).

## Estructura

```text
src/
├── signal/     # modelo de señal (original/working), parseo CSV, recorte, marcadores
├── metrics/    # detección de picos R, HRV, regla, métricas por ventana
├── render/     # escala, dibujo de señal, rejilla milimetrada clínica, marcadores, selección→rango
├── hooks/      # ventana visible, herramienta activa, marcadores, guardia de cambios
├── api/        # cliente HTTP y clientes de filtro/estudio/xlsx
├── components/ # ECGChart (canvas doble capa), paneles y diálogos
└── pages/      # MainPage (orquestación)
```

Los cálculos (parseo, HRV, DSP-model, geometría) son funciones puras con tests colocados
(`*.test.ts`). Los benchmarks de rendimiento están en `tests/perf/`.
