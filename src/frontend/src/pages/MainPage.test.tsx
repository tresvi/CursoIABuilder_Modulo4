import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MainPage } from "./MainPage";

/** Crea un File CSV para simular la carga del usuario. */
function csvFile(name: string, content: string): File {
  return new File([content], name, { type: "text/csv" });
}

describe("MainPage — integración US1 + US2", () => {
  it("renderiza el encabezado y el prompt inicial sin señal", () => {
    render(<MainPage />);
    expect(
      screen.getByRole("heading", { name: "ECGViewer" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Cargá un archivo CSV/i)).toBeInTheDocument();
  });

  it("carga un CSV válido y muestra métricas (BPM ~60) sobre la ventana", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);

    // 6 s de señal con picos R cada 1 s → 60 BPM.
    const fs = 250;
    const peaks = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    const rows: string[] = ["time,value"];
    for (let i = 0; i < 6 * fs; i++) {
      const t = i / fs;
      let v = 0;
      for (const p of peaks) v += Math.exp(-((t - p) ** 2) / (2 * 0.01 * 0.01));
      rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
    }
    const file = csvFile("ecg.csv", rows.join("\n"));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("metric-bpm")).toHaveTextContent("60");
    });
    expect(screen.getByTestId("ecg-chart")).toBeInTheDocument();
  });

  it("rechaza un CSV multicanal con un mensaje y no dibuja", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);
    const file = csvFile(
      "multi.csv",
      "time,ch1,ch2\n0,0.1,0.2\n0.004,0.15,0.25\n"
    );

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/un canal/i);
    });
    // sigue mostrando el prompt: no se cargó señal
    expect(screen.getByText(/Cargá un archivo CSV/i)).toBeInTheDocument();
  });
});
