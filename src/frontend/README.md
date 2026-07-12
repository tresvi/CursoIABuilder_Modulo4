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

## Carga de datos (US1)

`FileLoader` ofrece dos vías, juntas en la barra de herramientas:

- **Selector de archivo** nativo (`<input type="file">`) para un CSV propio.
- **📈 Cargar ejemplo**: botón destacado (fondo azul `#1565c0`) que trae un ECG de
  muestra sin que el usuario tenga que copiar archivos a su PC. Hace `fetch` de
  `public/ejemplos/ECG_20_Seg_FILTRADO.csv` (servido como asset estático por Vite en
  `${import.meta.env.BASE_URL}ejemplos/…`) y lo procesa por el mismo `parseCsv` que un
  archivo cargado a mano. Los otros CSV de muestra viven en `Ejemplos_Archivos_CSV/` en la
  raíz del repo; solo el filtrado se publica en `public/` para el botón.

## Convención de UI: iconos en botones de acción

Los botones de acción de la barra llevan un emoji al inicio como ayuda visual, coherente
con las herramientas de mouse (🔍 Zoom, ✋ Desplazar, 📏 Regla, ✂️ Recorte, 📍 Marcar) y
con acciones como 💾 Guardar, ⬇️ Exportar / ⬆️ Importar XLSX, 📈 Cargar ejemplo y
🔄 Restablecer zoom. Al agregar un botón nuevo, mantener este criterio.

## Colores de la grilla y del trazo (`render/`)

Grilla tipo papel milimetrado de ECG (`render/drawGrid.ts`):

- **`#fbe7e7`** — líneas finas, subdivisiones cada **1 mm** (`FINE_COLOR`).
- **`#f0c4c4`** — líneas gruesas, divisiones cada **5 mm**, dibujadas encima de las finas
  (`COARSE_COLOR`).

Otros colores del render, por referencia:

- **`#1565c0`** — trazo de la señal ECG (`render/drawSignal.ts`); mismo azul que el botón
  "Cargar ejemplo".
- **`#9e9e9e`** (ejes) y **`#333`** (texto de ejes) en `render/drawAxes.ts`.
- **`rgba(230,81,0,·)`** — marcadores (`render/drawMarkers.ts`).
