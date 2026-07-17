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

## Ventana visible, zoom y duración

La **ventana visible** (`hooks/useVisibleWindow.ts`) es el rango temporal sobre el que se
dibuja y se calculan las métricas (Principio IV). Reglas de reinicio:

- **Al cargar** un archivo, la vista inicial se acota a los primeros
  **`MAX_INITIAL_SECONDS` = 20 s** (o menos si el ensayo es más corto). Un ensayo largo tiene
  demasiadas muestras para dibujar de una: `drawSignal` solo recorre las muestras dentro del
  rango visible, así que acotar la vista aligera el render y mejora la legibilidad. El usuario
  puede desplazarse (pan) o usar "Restablecer zoom".
- **Al aplicar un filtro**, el zoom **se conserva**: el filtro cambia amplitudes pero no el eje
  de tiempo. El hook distingue "cargar" de "filtrar/recortar" con una `loadKey` (la identidad de
  la señal original, que solo cambia al cargar otra señal).
- **Al recortar**, se muestra el rango recortado.
- **"Restablecer zoom"** vuelve a la señal **completa** aunque supere 20 s (AC-09).

La `TopBar` muestra, **junto al nombre del archivo** (primero el nombre y luego la duración), la
**duración total del ensayo abierto** en formato `HH:MM:SS` (`formatDuration`), tomada de la
señal original (estable ante filtro/recorte).

## Inicio y restauración del estudio (US8)

Al arrancar, la app **no** restaura automáticamente el último estudio: siempre abre en el estado
vacío. Si `GET /api/study` detecta un estudio guardado, el estado vacío ofrece un botón
**"Restaurar último estudio"** que lo reconstruye a pedido (señal original + filtro re-aplicado
vía backend + recorte + marcadores). El guardado sigue siendo explícito (solo "Guardar").

## Convención de UI: sidebar y grupos

Las acciones y modos de mouse viven en la **sidebar** (`components/layout/Sidebar.tsx`), en
grupos colapsables de `NavItem` (ícono + etiqueta; solo ícono cuando la sidebar está
colapsada). Los handlers viven en `MainPage`; la sidebar no tiene lógica de dominio. Los grupos,
en orden:

- **Archivo**: Abrir CSV, Cargar ejemplo (ambos en `FileLoader`), Importar XLSX, Guardar,
  Guardar como CSV, Exportar XLSX.
- **Herramientas**: Rejilla ECG, **Zoom**, **Restablecer zoom**, Desplazar, Regla, Recortar,
  Marcar. "Restablecer zoom" va **inmediatamente debajo de "Zoom"** (se inserta tras el ítem
  `zoom` dentro del `map` de `TOOLS`); el resto de los modos de mouse resaltan el activo con
  `active` (`aria`/estilo). Al agregar una herramienta nueva, sumarla a este grupo.
- **Filtros**: Pasa Bajo, Pasa Alto, Pasa Banda, Notch y Restaurar (revierte el filtro).

La velocidad de papel y el estado de guardado viven en la `TopBar`, no en la sidebar.

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
