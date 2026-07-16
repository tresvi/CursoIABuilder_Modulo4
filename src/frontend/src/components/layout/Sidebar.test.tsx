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

  it("colapsar la sección 'Filtros' oculta sus ítems", () => {
    renderSidebar({ collapsed: false });
    const header = screen.getByRole("button", { name: /filtros/i });

    // Abierta por defecto: sus ítems son visibles y aria-expanded=true.
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Pasa Banda")).toBeInTheDocument();

    fireEvent.click(header);

    // Colapsada: ítems ocultos y aria-expanded=false.
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Pasa Banda")).toBeNull();
  });
});
