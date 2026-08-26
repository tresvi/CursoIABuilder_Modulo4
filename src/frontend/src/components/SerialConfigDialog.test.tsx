import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SerialConfigDialog } from "./SerialConfigDialog";

describe("SerialConfigDialog (US1)", () => {
  it("lista los puertos recibidos", () => {
    render(
      <SerialConfigDialog
        open
        ports={["COM3", "COM4"]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const select = screen.getByLabelText("Puerto");
    expect(select).toHaveTextContent("COM3");
    expect(select).toHaveTextContent("COM4");
  });

  it("el campo de baudios muestra 115200 preseleccionado (FR-003)", () => {
    render(
      <SerialConfigDialog
        open
        ports={["COM3"]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Velocidad (baudios)")).toHaveValue(115200);
  });

  it("al confirmar, expone la elección al padre", () => {
    const onConfirm = vi.fn();
    render(
      <SerialConfigDialog
        open
        ports={["COM3", "COM4"]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("Puerto"), {
      target: { value: "COM4" },
    });
    fireEvent.change(screen.getByLabelText("Velocidad (baudios)"), {
      target: { value: "9600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(onConfirm).toHaveBeenCalledWith({ port: "COM4", baudRate: 9600 });
  });

  it("no renderiza nada si open es false", () => {
    render(
      <SerialConfigDialog
        open={false}
        ports={["COM3"]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Puerto")).toBeNull();
  });
});
