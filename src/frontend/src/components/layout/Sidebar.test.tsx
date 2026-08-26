import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

/**
 * Props por defecto de la Sidebar (handlers como spies). Cada test sobreescribe
 * lo que necesita. `fileLoader` se pasa como nodo simple: acá probamos el
 * comportamiento de la sidebar, no la carga de archivos.
 */
function renderSidebar(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const props = {
    collapsed: false,
    onToggleCollapse: vi.fn(),
    hasSignal: true,
    fileLoader: <div data-testid="file-loader-stub" />,
    onImportXlsx: vi.fn(),
    onSave: vi.fn(),
    onExportCsv: vi.fn(),
    onExportXlsx: vi.fn(),
    activeFilterType: "bandpass" as const,
    onSelectFilter: vi.fn(),
    onRevertFilter: vi.fn(),
    hasFilter: false,
    tool: "none" as const,
    onSelectTool: vi.fn(),
    showGrid: true,
    onToggleGrid: vi.fn(),
    onResetZoom: vi.fn(),
    complexDetectionActive: false,
    complexDetectionStatus: "idle" as const,
    onToggleComplexDetection: vi.fn(),
    spectrumActive: false,
    spectrumStatus: "idle" as const,
    onToggleSpectrum: vi.fn(),
    ...overrides,
  };
  render(<Sidebar {...props} />);
  return props;
}

describe("Sidebar — colapso (US2/US3)", () => {
  it("el botón hamburguesa invoca onToggleCollapse", () => {
    const props = renderSidebar({ collapsed: false });
    fireEvent.click(screen.getByRole("button", { name: "Colapsar menú" }));
    expect(props.onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("colapsada: el toggle dice 'Expandir menú' y se ocultan las etiquetas de texto", () => {
    renderSidebar({ collapsed: true });
    expect(
      screen.getByRole("button", { name: "Expandir menú" })
    ).toBeInTheDocument();
    // En modo íconos, los NavItem no renderizan su etiqueta de texto.
    expect(screen.queryByText("Guardar")).toBeNull();
    expect(screen.queryByText("Pasa Banda")).toBeNull();
  });

  it("colapsar la sección 'Diagnósticos' oculta sus ítems", () => {
    renderSidebar({ collapsed: false });
    const header = screen.getByRole("button", { name: /diagnósticos/i });

    // Abierta por defecto: sus ítems son visibles y aria-expanded=true.
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Pasa Banda")).toBeInTheDocument();

    fireEvent.click(header);

    // Colapsada: ítems ocultos y aria-expanded=false.
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Pasa Banda")).toBeNull();
  });

  // SC-005: los controles de colapso son <button> nativos → operables por
  // teclado (Enter/Espacio) y foco por semántica, sin manejadores ad-hoc.
  it("los controles de colapso son botones nativos (operables por teclado)", () => {
    renderSidebar({ collapsed: false });
    const toggle = screen.getByRole("button", { name: "Colapsar menú" });
    const section = screen.getByRole("button", { name: /herramientas/i });
    expect(toggle.tagName).toBe("BUTTON");
    expect(section.tagName).toBe("BUTTON");
  });
});

describe("Sidebar — Diagnósticos y Detec. Complejos (feature 003)", () => {
  it("la sección se llama 'Diagnósticos' y 'Detec. Complejos' es su primer ítem", () => {
    renderSidebar();
    const header = screen.getByRole("button", { name: /diagnósticos/i });
    expect(header).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^filtros$/i })).toBeNull();

    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    const detecIdx = buttons.findIndex((t) => t?.includes("Detec. Complejos"));
    const pasaBajoIdx = buttons.findIndex((t) => t?.includes("Pasa Bajo"));
    expect(detecIdx).toBeGreaterThan(-1);
    expect(detecIdx).toBeLessThan(pasaBajoIdx);
  });

  it("'Detec. Complejos' está deshabilitado sin señal cargada", () => {
    renderSidebar({ hasSignal: false });
    expect(screen.getByRole("button", { name: /detec\. complejos/i })).toBeDisabled();
  });

  it("al hacer click invoca onToggleComplexDetection", () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /detec\. complejos/i }));
    expect(props.onToggleComplexDetection).toHaveBeenCalledTimes(1);
  });

  it("puede estar 'active' al mismo tiempo que un filtro de señal (no son excluyentes, FR-007)", () => {
    renderSidebar({ complexDetectionActive: true, activeFilterType: "bandpass" });
    const detec = screen.getByRole("button", { name: /detec\. complejos/i });
    const bandpass = screen.getByRole("button", { name: "Pasa Banda" });
    // Ambos "presionados" a la vez: complexDetectionActive es un estado propio,
    // independiente de activeFilterType (que sigue siendo de selección única
    // entre los filtros de señal entre sí).
    expect(detec).toHaveAttribute("aria-pressed", "true");
    expect(bandpass).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra un estado de 'procesando' mientras complexDetectionStatus === 'processing'", () => {
    renderSidebar({ complexDetectionActive: true, complexDetectionStatus: "processing" });
    const detec = screen.getByRole("button", { name: /detectando/i });
    expect(detec).toBeDisabled();
  });
});

describe("Sidebar — Espectro (feature 004)", () => {
  it("aparece 'Espectro' en 'Diagnósticos'", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: /^espectro$/i })).toBeInTheDocument();
  });

  it("'Espectro' está deshabilitado sin señal cargada", () => {
    renderSidebar({ hasSignal: false });
    expect(screen.getByRole("button", { name: /^espectro$/i })).toBeDisabled();
  });

  it("al hacer click invoca onToggleSpectrum", () => {
    const props = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /^espectro$/i }));
    expect(props.onToggleSpectrum).toHaveBeenCalledTimes(1);
  });

  it("refleja spectrumActive vía aria-pressed", () => {
    renderSidebar({ spectrumActive: true });
    expect(screen.getByRole("button", { name: /^espectro$/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
