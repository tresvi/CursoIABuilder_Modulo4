import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MARKER_TEXT_MAX, MarkerPromptDialog } from "./MarkerPromptDialog";

describe("MarkerPromptDialog (US6)", () => {
  it("no se renderiza cuando open=false", () => {
    render(
      <MarkerPromptDialog open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("al aceptar confirma con el texto ingresado", () => {
    const onConfirm = vi.fn();
    render(
      <MarkerPromptDialog open onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText("Texto del marcador"), {
      target: { value: "Latido ectópico" },
    });
    fireEvent.click(screen.getByText("Aceptar"));
    expect(onConfirm).toHaveBeenCalledWith("Latido ectópico");
  });

  it("al cancelar no confirma", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <MarkerPromptDialog open onConfirm={onConfirm} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("limita el texto a 255 caracteres", () => {
    render(<MarkerPromptDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Texto del marcador");
    expect(input).toHaveAttribute("maxlength", String(MARKER_TEXT_MAX));
    expect(MARKER_TEXT_MAX).toBe(255);
  });
});
