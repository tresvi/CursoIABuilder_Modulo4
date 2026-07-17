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

`FileLoader` (grupo "Archivo" de la sidebar) ofrece dos vías:

- **Abrir CSV**: selector de archivo nativo (`<input type="file">` oculto) para un CSV propio.
- **📈 Cargar ejemplo**: botón **desplegable** que lista los ECG de muestra y carga el elegido.
  Al abrirlo muestra los tres ejemplos —filtrado, sin filtrar y con mucho ruido— y hace `fetch`
  de `public/ejemplos/<archivo>.csv` (asset estático de Vite en
  `${import.meta.env.BASE_URL}ejemplos/…`), procesándolo por el mismo `parseCsv` que un archivo
  cargado a mano. Los tres CSV se publican en `public/ejemplos/`; los originales también viven
  en `Ejemplos_Archivos_CSV/` en la raíz del repo.

El desplegable está en `ExampleMenu`, un componente reutilizable cuyo botón disparador se pasa
por render-prop: la sidebar lo usa con un `NavItem` y el **estado vacío** del área de trabajo con
un `Button`, de modo que se puede cargar un ejemplo tanto desde la barra como desde la pantalla
de bienvenida. Esa pantalla muestra el texto "Cargá un archivo CSV … o bien elige cargar un
ejemplo" junto al botón.

`parseCsv` ignora líneas de comentario que empiezan con `#`: el ejemplo "con mucho ruido"
(`ECG_20_Seg_ESPANTOSO.csv`) trae al final anotaciones de complejos (`## t#|#v#|#etiqueta`) que
no son filas de datos.

## Guardar como CSV

La primera acción de la barra de herramientas es **💾 Guardar como CSV** (`signal/csvExport.ts`):
genera el CSV de la señal **actual** del viewer (con filtro/recorte aplicados) y dispara la
descarga en el cliente, sin backend. El formato (`tiempo,mV`) es compatible con `parseCsv`, así
que el archivo descargado se puede volver a cargar (round-trip).

## Inicio y restauración del estudio (US8)

Al arrancar, la app **no** restaura automáticamente el último estudio: siempre abre en el estado
vacío. Si `GET /api/study` detecta un estudio guardado, el estado vacío ofrece un botón
**"Restaurar último estudio"** que lo reconstruye a pedido (señal original + filtro re-aplicado
vía backend + recorte + marcadores). El guardado sigue siendo explícito (solo "Guardar").

## Convención de UI: barra de herramientas e iconos

Las acciones y modos de mouse viven agrupados en un contenedor `role="toolbar"` (recuadrado)
dentro de `MainPage`, en este orden fijo: **⬇️ Exportar XLSX · ⬆️ Importar XLSX · 🔍 Zoom ·
🔄 Restablecer zoom · ✋ Desplazar · 📏 Regla · ✂️ Recorte · 📍 Marcar**. Los cinco modos de
mouse (Zoom/Desplazar/Regla/Recorte/Marcar) se renderizan con el helper `toolBtn(id)`, que
resalta el modo activo (`aria-pressed` + negrita). Al agregar una herramienta nueva, meterla
en esta barra en vez de dejarla como botón suelto.

Quedan **fuera** de la barra por ser otra categoría: la carga de datos (Seleccionar archivo /
📈 Cargar ejemplo), las opciones de visualización (Rejilla ECG / Velocidad) y 💾 Guardar.

Todos los botones de acción llevan un emoji al inicio como ayuda visual (💾 Guardar,
⬇️ Exportar / ⬆️ Importar XLSX, 📈 Cargar ejemplo, 🔄 Restablecer zoom). Al agregar un botón
nuevo, mantener este criterio.

## Marcadores de evento (US6)

Con la herramienta **📍 Marcar** activa, al hacer click sobre el gráfico se abre un popup
(`MarkerPromptDialog`) que pide el texto del marcador:

- El input limita a **255 caracteres** (`MARKER_TEXT_MAX`) y muestra un contador `n/255`.
- **Cancelar** (o `Esc`) descarta: no se crea el marcador. **Aceptar** (o `Enter`) crea la
  marca anclada al instante clickeado con el texto ingresado.
- Sobre el gráfico, la etiqueta se acorta con `displayLabel()` (`render/drawMarkers.ts`): si
  el texto supera **10 caracteres**, se dibujan solo los primeros **8 seguidos de "..."**. El
  texto completo se conserva y se ve/edita entero en el panel de Marcadores.

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
