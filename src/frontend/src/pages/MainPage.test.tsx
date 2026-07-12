import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MainPage } from "./MainPage";
import * as studyApi from "../api/studyApi";

// Evita llamadas de red en los tests y permite espiar el guardado.
vi.mock("../api/studyApi", () => ({
  getStudy: vi.fn(() => Promise.resolve(null)),
  saveStudy: vi.fn(() => Promise.resolve(new Date().toISOString())),
}));

/** Crea un File CSV para simular la carga del usuario. */
function csvFile(name: string, content: string): File {
  return new File([content], name, { type: "text/csv" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studyApi.getStudy).mockResolvedValue(null);
});

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

  it("persistencia explícita: solo 'Guardar' invoca saveStudy (US8, FR-016/017, T054a)", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);
    const rows = ["time,value"];
    for (let i = 0; i < 300; i++) rows.push(`${(i / 250).toFixed(4)},0`);
    fireEvent.change(input, {
      target: { files: [csvFile("f.csv", rows.join("\n"))] },
    });

    // esperar a que la señal cargue (botón "Guardar" habilitado)
    await waitFor(() => expect(screen.getByTestId("save-btn")).toBeEnabled());
    // tras cargar (una mutación), NO se persiste nada automáticamente
    expect(studyApi.saveStudy).not.toHaveBeenCalled();

    // recién al presionar "Guardar" se persiste
    fireEvent.click(screen.getByTestId("save-btn"));
    await waitFor(() => expect(studyApi.saveStudy).toHaveBeenCalledTimes(1));
  });
});
