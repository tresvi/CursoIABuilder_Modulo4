# Quickstart — Validación de ECGViewer

Guía ejecutable para levantar la app y validar de punta a punta las historias del spec. No
duplica implementación: los detalles viven en `data-model.md`, `contracts/api.md` y `tasks.md`.

## Prerrequisitos

- **.NET 10 SDK**
- **Node 20+** con `npm`
- Un CSV de ECG monocanal de ~1 minuto (archivo de referencia para los umbrales de rendimiento).

## Levantar la app

Terminal 1 — backend (`http://localhost:5080`):
```bash
cd src/backend
dotnet restore
dotnet run --project ECGViewer.Api
```

Terminal 2 — frontend (`http://localhost:5173`):
```bash
cd src/frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`. El front consume la API vía `VITE_API_BASE`
(por defecto `http://localhost:5080`).

## Correr los tests (puertas de calidad)

```bash
# Backend (xUnit): DSP, XLSX, persistencia
cd src/backend && dotnet test

# Frontend (Vitest): parseo CSV, métricas HRV, geometría de interacción
cd src/frontend && npm test

# E2E (Playwright, si se agregan)
cd src/frontend && npx playwright test
```

> **TDD (Principio I)**: cada escenario abajo debe tener su test escrito **antes** que la
> implementación (rojo → verde → refactor).

## Escenarios de validación (mapeados al spec)

### US1 — Cargar y visualizar (P1)
1. Cargar un CSV válido de 1 canal ⇒ la señal se dibuja: eje X en s, eje Y en mV, cada eje con su
   escala numérica visible (ticks con valores y unidad); orden temporal respetado (AC-01, AC-04).
2. Cargar CSV inválido (columnas faltantes / no numérico / encabezado malo) ⇒ mensaje de error,
   no dibuja (AC-02).
3. Cargar CSV multicanal ⇒ "solo soporta un canal", no procesa (AC-03).
4. Alternar rejilla ECG ⇒ papel milimetrado (finas 1 mm, gruesas 5 mm, 10 mm/mV en Y) se
   muestra/oculta, anclado a la señal al hacer pan/zoom (AC-10, FR-004).
5. Cambiar la velocidad de papel (25 ↔ 50 mm/s) ⇒ el paso temporal de la rejilla en X se ajusta
   (cuadro grande 0.2 s a 25 mm/s; 0.1 s a 50 mm/s) (FR-022). Alejar el zoom ⇒ las finas dejan
   de dibujarse antes de amontonarse (guarda de 4 px).
- **Rendimiento**: render de la señal de 1 min < 0.1 s p95 sobre 20 cargas (SC-001/RNF-01).

### US2 — Métricas sobre la ventana visible (P1)
5. Con una ventana visible dada ⇒ BPM, SDNN, RMSSD, pNN50 calculados **solo** sobre esa ventana
   (AC-18). Cambiar el rango ⇒ se recalculan (AC-19).
6. Ventana con < 2 picos R ⇒ métricas HRV "—" (y BPM "—" si no hay ≥ 1 RR), panel visible
   (FR-006, edge case).
- **Rendimiento**: cálculo < 0.1 s p95 sobre 20 mediciones para 1 min (SC-002/RNF-03).

### US3 — Zoom y desplazamiento (P2)
7. Con Zoom activo, arrastre horizontal ⇒ cursor lupa, selección abarca todo el eje Y, define
   rango X; al soltar, la vista se acerca (AC-08). "Restablecer zoom" ⇒ señal completa (AC-09).
7b. Con la vista ampliada y Desplazar (pan) activo ⇒ cursor de mano, arrastrar horizontalmente
   mueve la ventana visible (con clamp a los extremos) y las métricas se recalculan (FR-023).

### US4 — Filtrar y revertir (P2)
8. Aplicar filtro (pasa bajo/alto/banda/notch) con sus cortes ⇒ el gráfico se actualiza en la
   misma pantalla (AC-14, `POST /api/filter`).
9. Revertir ⇒ la señal coincide **exactamente** con la original (AC-15, SC-009).

### US5 — Regla y recorte (P2)
10. Con Regla activa, arrastrar ⇒ cursor regla, recta del recorrido + recuadro que la
    circunscribe (ancho = Δt, alto = Δamplitud), Δt (s) y Δamplitud (mV) en vivo; al soltar, la
    medición (recta y recuadro) desaparece y la señal no cambia (AC-11).
11. Con Recorte activo, arrastrar ⇒ cursor tijera, selección de rango X, región a conservar
    resaltada, **sin** recortar aún (AC-12). Cartel de confirmación: aceptar ⇒ nueva señal
    acotada; cancelar ⇒ intacta (AC-13).

### US6 — Marcadores (P3)
12. Con Marcar activo, clic ⇒ marcador anclado al instante, visible en la sesión (AC-05). Editar
    etiqueta (AC-06); eliminar (AC-07).

### US7 — Import/Export XLSX (P3)
13. Exportar a `.xlsx` (`POST /api/export/xlsx`) y reimportar (`POST /api/import/xlsx`) ⇒ tiempo
    y señal conservados (AC-16, SC-006). XLSX con estructura inválida ⇒ error (AC-17).

### US8 — Guardado explícito y guardia (P2)
14. Con cambios pendientes, presionar "Guardar" (`PUT /api/study`) ⇒ recién entonces persiste
    (AC-20). Restaurar con `GET /api/study` reconstruye el estudio.
15. Cerrar/recargar con cambios sin guardar ⇒ alerta de confirmación; sin guardar, no persiste
    (AC-25, AC-26). Sin cambios pendientes ⇒ sin alerta (edge case).

## Criterios de aceptación transversales

- SC-007: 100 % de archivos inválidos/multicanal rechazados sin dibujar señal.
- SC-003/RNF-02: interacción ≥ 10 fps (frame < 100 ms) sin redibujo completo (panel Performance).
- SC-008/RNF-04: operaciones básicas sin errores en Chrome/Firefox/Edge (desktop), Chrome Android,
  Safari iOS.
