import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SerialConfigDialog } from "./SerialConfigDialog";
import type { SerialPortLike } from "../serial/webSerialTypes";

function fakePort(): SerialPortLike {
  return {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    readable: null,
  };
}

describe("SerialConfigDialog (Web Serial API, feature 005)", () => {
  it("el campo de baudios muestra 115200 preseleccionado (FR-003)", () => {
    render(
      <SerialConfigDialog
        open
        requestPort={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Velocidad (baudios)")).toHaveValue(115200);
  });

  it("'Aceptar' está deshabilitado hasta elegir un dispositivo", () => {
    render(
      <SerialConfigDialog
        open
        requestPort={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeDisabled();
  });

  it("'Elegir dispositivo' llama a requestPort() y habilita 'Aceptar'", async () => {
    const port = fakePort();
    const requestPort = vi.fn().mockResolvedValue(port);
    render(
      <SerialConfigDialog
        open
        requestPort={requestPort}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Elegir dispositivo" }));
    expect(requestPort).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled()
    );
  });

  it("al confirmar, expone el puerto elegido y la velocidad al padre", async () => {
    const port = fakePort();
    const requestPort = vi.fn().mockResolvedValue(port);
    const onConfirm = vi.fn();
    render(
      <SerialConfigDialog
        open
        requestPort={requestPort}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Elegir dispositivo" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled()
    );

    fireEvent.change(screen.getByLabelText("Velocidad (baudios)"), {
      target: { value: "9600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(onConfirm).toHaveBeenCalledWith({ port, baudRate: 9600 });
  });

  it("sin soporte de Web Serial API (requestPort ausente), avisa y no permite continuar", () => {
    render(
      <SerialConfigDialog
        open
        requestPort={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/no soporta/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Elegir dispositivo" })
    ).toBeNull();
  });

  it("no renderiza nada si open es false", () => {
    render(
      <SerialConfigDialog
        open={false}
        requestPort={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Velocidad (baudios)")).toBeNull();
  });
});
