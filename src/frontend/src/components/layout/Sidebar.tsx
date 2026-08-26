import { Fragment, useState, type ReactNode } from "react";
import {
  ChartSpline,
  ChevronDown,
  Crop,
  Download,
  Grid3x3,
  HeartPulse,
  MapPin,
  Menu,
  Move,
  Plug,
  PlugZap,
  RotateCcw,
  Ruler,
  Save,
  Settings,
  ScanSearch,
  Upload,
  Waves,
  ZoomIn,
} from "lucide-react";
import type { Tool } from "@/hooks/useTool";
import type { ComplexDetectionStatus } from "@/hooks/useComplexDetection";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  hasSignal: boolean;
  /** FileLoader (posee el input CSV + "Cargar ejemplo"), renderizado en Archivo. */
  fileLoader: ReactNode;
  onImportXlsx: () => void;
  onSave: () => void;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  tool: Tool;
  onSelectTool: (tool: Tool) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onResetZoom: () => void;
  /** "Detec. Complejos" (feature 003): independiente de activeFilterType,
   * puede estar activo al mismo tiempo que un filtro de señal (FR-007). */
  complexDetectionActive: boolean;
  complexDetectionStatus: ComplexDetectionStatus;
  onToggleComplexDetection: () => void;
  /** "Espectro" (feature 004): alterna el gráfico principal entre trazado y
   * espectro de potencia; "busy" mientras se calcula (research.md D5). */
  spectrumActive: boolean;
  spectrumStatus: "idle" | "busy" | "ready" | "error";
  onToggleSpectrum: () => void;
  /** "Conectarse" (feature 005): conexión al hardware del ECG por puerto serie. */
  onOpenSerialConfig: () => void;
  /** Habilita "Conectarse" una vez que se eligió puerto y baudios (US1). */
  serialConfigured: boolean;
  serialConnected: boolean;
  onToggleSerialConnection: () => void;
  /** "Desconectarse" (feature 005, US3): reemplaza a "Conectarse" mientras hay
   * una conexión activa. */
  onDisconnectSerial: () => void;
}

const TOOLS: Array<{ id: Tool; label: string; icon: typeof Waves }> = [
  { id: "zoom", label: "Zoom", icon: ZoomIn },
  { id: "pan", label: "Desplazar", icon: Move },
  { id: "ruler", label: "Regla", icon: Ruler },
  { id: "crop", label: "Recortar", icon: Crop },
  { id: "marker", label: "Marcar", icon: MapPin },
];

/**
 * Grupo colapsable de la sidebar: encabezado clickeable (con chevron) que
 * muestra/oculta sus ítems. Cuando la sidebar está en modo solo-íconos no hay
 * encabezado: se muestran todos los ítems separados por un divisor.
 */
function SidebarGroup({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  if (collapsed) {
    return (
      <>
        <div className="my-2 h-px bg-sidebar-border" />
        {children}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-muted transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            !open && "-rotate-90"
          )}
          aria-hidden
        />
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

/**
 * Sidebar navy colapsable (US-UI): reproduce los dos mockups (expandida con
 * texto / colapsada solo íconos). Cada ítem dispara handlers que ya viven en
 * MainPage; no contiene lógica de dominio.
 */
export function Sidebar({
  collapsed,
  onToggleCollapse,
  hasSignal,
  fileLoader,
  onImportXlsx,
  onSave,
  onExportCsv,
  onExportXlsx,
  tool,
  onSelectTool,
  showGrid,
  onToggleGrid,
  onResetZoom,
  complexDetectionActive,
  complexDetectionStatus,
  onToggleComplexDetection,
  spectrumActive,
  spectrumStatus,
  onToggleSpectrum,
  onOpenSerialConfig,
  serialConfigured,
  serialConnected,
  onToggleSerialConnection,
  onDisconnectSerial,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
      data-testid="sidebar"
      data-collapsed={collapsed}
    >
      {/* Encabezado: menú hamburguesa (toggle) + marca */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border px-2 py-3",
          collapsed && "justify-center px-0"
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-expanded={!collapsed}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <HeartPulse className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="text-base font-bold tracking-tight">
              ECG Viewer
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SidebarGroup title="Archivo" collapsed={collapsed}>
          {fileLoader}
          <NavItem
            icon={Upload}
            label="Importar XLSX"
            collapsed={collapsed}
            onClick={onImportXlsx}
          />
          <NavItem
            icon={Save}
            label="Guardar"
            collapsed={collapsed}
            onClick={onSave}
            disabled={!hasSignal}
            data-testid="save-btn"
          />
          <NavItem
            icon={Download}
            label="Guardar como CSV"
            collapsed={collapsed}
            onClick={onExportCsv}
            disabled={!hasSignal}
          />
          <NavItem
            icon={Download}
            label="Exportar XLSX"
            collapsed={collapsed}
            onClick={onExportXlsx}
            disabled={!hasSignal}
          />
        </SidebarGroup>

        <SidebarGroup title="Herramientas" collapsed={collapsed}>
          <NavItem
            icon={Grid3x3}
            label="Rejilla ECG"
            collapsed={collapsed}
            active={showGrid}
            onClick={onToggleGrid}
          />
          {TOOLS.map((t) => (
            <Fragment key={t.id}>
              <NavItem
                icon={t.icon}
                label={t.label}
                collapsed={collapsed}
                active={tool === t.id}
                onClick={() => onSelectTool(t.id)}
                disabled={!hasSignal}
              />
              {/* "Restablecer zoom" va inmediatamente debajo de "Zoom". */}
              {t.id === "zoom" && (
                <NavItem
                  icon={RotateCcw}
                  label="Restablecer zoom"
                  collapsed={collapsed}
                  onClick={onResetZoom}
                  disabled={!hasSignal}
                />
              )}
            </Fragment>
          ))}
        </SidebarGroup>

        <SidebarGroup title="Diagnósticos" collapsed={collapsed}>
          <NavItem
            icon={ScanSearch}
            label={
              complexDetectionStatus === "processing"
                ? "Detectando…"
                : "Detec. Complejos"
            }
            collapsed={collapsed}
            active={complexDetectionActive}
            onClick={onToggleComplexDetection}
            disabled={!hasSignal || complexDetectionStatus === "processing"}
          />
          <NavItem
            icon={ChartSpline}
            label={spectrumStatus === "busy" ? "Calculando…" : "Espectro"}
            collapsed={collapsed}
            active={spectrumActive}
            onClick={onToggleSpectrum}
            disabled={!hasSignal || spectrumStatus === "busy"}
          />
        </SidebarGroup>

        <SidebarGroup title="Conectarse" collapsed={collapsed}>
          <NavItem
            icon={Settings}
            label="Configuración"
            collapsed={collapsed}
            onClick={onOpenSerialConfig}
          />
          {serialConnected ? (
            <NavItem
              icon={PlugZap}
              label="Desconectarse"
              collapsed={collapsed}
              active
              onClick={onDisconnectSerial}
            />
          ) : (
            <NavItem
              icon={Plug}
              label="Conectarse"
              collapsed={collapsed}
              onClick={onToggleSerialConnection}
              disabled={!serialConfigured}
            />
          )}
        </SidebarGroup>
      </nav>
    </aside>
  );
}
