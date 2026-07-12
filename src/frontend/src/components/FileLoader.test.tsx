import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileLoader } from "./FileLoader";

const EXAMPLE_CSV = "tiempo,mV\n0,0.1\n0.004,0.2\n";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(EXAMPLE_CSV, { status: 200 })))
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("FileLoader — desplegable de ejemplos", () => {
  it("el botón despliega la lista y al elegir un ejemplo lo carga", async () => {
    const onLoad = vi.fn();
    render(<FileLoader onLoad={onLoad} />);

    // La lista no está visible hasta presionar el botón.
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Cargar ejemplo/i }));
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(3);

    fireEvent.click(screen.getByRole("menuitem", { name: /filtrado \(20 s\)/i }));
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));

    const signal = onLoad.mock.calls[0][0];
    expect(signal.samples).toHaveLength(2);
    // Tras cargar, el menú se cierra.
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
