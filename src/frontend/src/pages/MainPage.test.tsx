import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MainPage } from "./MainPage";
import * as studyApi from "../api/studyApi";
import * as filterApi from "../api/filterApi";
import * as spectrumApi from "../api/spectrumApi";
import { ApiRequestError } from "../api/client";

// Evita llamadas de red en los tests y permite espiar el guardado.
vi.mock("../api/studyApi", () => ({
  getStudy: vi.fn(() => Promise.resolve(null)),
  saveStudy: vi.fn(() => Promise.resolve(new Date().toISOString())),
}));

// Evita llamadas de red al aplicar un filtro: devuelve la señal sin cambios
// (alcanza para probar que se dispara la recalculación de complejos, FR-007).
vi.mock("../api/filterApi", () => ({
  applyFilter: vi.fn((signal: { samples: unknown }) =>
    Promise.resolve(signal.samples)
  ),
}));

// Evita llamadas de red al calcular el espectro (feature 004).
vi.mock("../api/spectrumApi", () => ({
  computeSpectrum: vi.fn(() =>
    Promise.resolve([{ frequency: 0, power: 0.1 }])
  ),
}));

/** Crea un File CSV para simular la carga del usuario. */
function csvFile(name: string, content: string): File {
  return new File([content], name, { type: "text/csv" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(studyApi.getStudy).mockResolvedValue(null);
  vi.mocked(spectrumApi.computeSpectrum).mockResolvedValue([
    { frequency: 0, power: 0.1 },
  ]);
});

describe("MainPage — integración US1 + US2", () => {
  it("renderiza el encabezado y el prompt inicial sin señal", () => {
    render(<MainPage />);
    expect(
      screen.getByRole("heading", { name: "ECGViewer" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cargá un archivo CSV.*o bien elige cargar un ejemplo/i)
    ).toBeInTheDocument();
  });

  it("el estado vacío ofrece cargar un ejemplo con menú desplegable", () => {
    render(<MainPage />);
    // Hay un botón "Cargar ejemplo" en el área de trabajo (además del de la sidebar).
    const triggers = screen.getAllByRole("button", { name: /Cargar ejemplo/i });
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    // Al abrir el del área de trabajo se listan los tres ejemplos.
    fireEvent.click(triggers[triggers.length - 1]);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("con un estudio guardado NO auto-restaura: arranca vacío y ofrece restaurarlo", async () => {
    vi.mocked(studyApi.getStudy).mockResolvedValue({
      signal: { samples: [{ t: 0, v: 0.1 }, { t: 0.004, v: 0.2 }], fs: 250 },
      markers: [],
      filter: null,
      crop: null,
    });
    render(<MainPage />);

    // Aunque haya estudio guardado, sigue en el estado vacío (no dibuja).
    const restore = await screen.findByRole("button", {
      name: /Restaurar último estudio/i,
    });
    expect(screen.getByText(/o bien elige cargar un ejemplo/i)).toBeInTheDocument();
    expect(screen.queryByTestId("ecg-chart")).toBeNull();

    // Recién al presionar el botón se restaura y se dibuja.
    fireEvent.click(restore);
    await waitFor(() =>
      expect(screen.getByTestId("ecg-chart")).toBeInTheDocument()
    );
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

  it("activar 'Detec. Complejos' pasa por 'procesando' y termina activo (feature 003, US1)", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);

    const fs = 250;
    const peaks = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    const rows: string[] = ["time,value"];
    for (let i = 0; i < 6 * fs; i++) {
      const t = i / fs;
      let v = 0;
      for (const p of peaks) v += Math.exp(-((t - p) ** 2) / (2 * 0.01 * 0.01));
      rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
    }
    fireEvent.change(input, { target: { files: [csvFile("ecg.csv", rows.join("\n"))] } });
    await waitFor(() => expect(screen.getByTestId("ecg-chart")).toBeInTheDocument());

    const toggle = screen.getByRole("button", { name: /detec\. complejos/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    // Se activa de inmediato (independiente de cuánto tarde el cálculo).
    expect(
      screen.getByRole("button", { name: /detec\. complejos|detectando/i })
    ).toHaveAttribute("aria-pressed", "true");

    // Y termina "ready" (deja de estar deshabilitado/"procesando").
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /detec\. complejos/i });
      expect(btn).toBeEnabled();
    });
  });

  it("desactivar 'Detec. Complejos' vuelve a 'idle' sin alterar la señal ni las métricas (US2)", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);
    const fs = 250;
    const peaks = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    const rows: string[] = ["time,value"];
    for (let i = 0; i < 6 * fs; i++) {
      const t = i / fs;
      let v = 0;
      for (const p of peaks) v += Math.exp(-((t - p) ** 2) / (2 * 0.01 * 0.01));
      rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
    }
    fireEvent.change(input, { target: { files: [csvFile("ecg.csv", rows.join("\n"))] } });
    await waitFor(() => expect(screen.getByTestId("metric-bpm")).toHaveTextContent("60"));

    const toggle = () => screen.getByRole("button", { name: /detec\. complejos/i });
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");

    const bpmBefore = screen.getByTestId("metric-bpm").textContent;

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("metric-bpm").textContent).toBe(bpmBefore);
  });

  it("con 'Detec. Complejos' activo, aplicar un filtro dispara una nueva detección sola (US2, FR-007)", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);
    const fs = 250;
    const peaks = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    const rows: string[] = ["time,value"];
    for (let i = 0; i < 6 * fs; i++) {
      const t = i / fs;
      let v = 0;
      for (const p of peaks) v += Math.exp(-((t - p) ** 2) / (2 * 0.01 * 0.01));
      rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
    }
    fireEvent.change(input, { target: { files: [csvFile("ecg.csv", rows.join("\n"))] } });
    await waitFor(() => expect(screen.getByTestId("ecg-chart")).toBeInTheDocument());

    const toggle = () => screen.getByRole("button", { name: /detec\. complejos/i });
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");

    // Aplicar un filtro (Pasa Banda, la aplicación al backend está mockeada):
    // no hace falta reactivar la herramienta, se recalcula sola.
    fireEvent.click(screen.getByRole("button", { name: /aplicar filtro/i }));

    await waitFor(() => expect(filterApi.applyFilter).toHaveBeenCalledTimes(1));
    // Vuelve a pasar por processing→ready sin intervención manual.
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("avisa cuando un tramo de la señal no permite detección confiable (US3, FR-008)", async () => {
    render(<MainPage />);
    const input = screen.getByLabelText(/Cargar archivo CSV/i);

    const fs = 250;
    const rows: string[] = ["time,value"];
    // Dos latidos limpios, un hueco de silencio de 3 s, dos latidos limpios más.
    const beat = (rt: number, t: number) =>
      Math.exp(-((t - rt) ** 2) / (2 * 0.01 * 0.01));
    for (let i = 0; i < 9 * fs; i++) {
      const t = i / fs;
      let v = 0;
      for (const rt of [0.5, 1.5, 7.0, 8.0]) v += beat(rt, t);
      rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
    }
    fireEvent.change(input, { target: { files: [csvFile("ecg.csv", rows.join("\n"))] } });
    await waitFor(() => expect(screen.getByTestId("ecg-chart")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /detec\. complejos/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/no se pudo detectar/i);
    });
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

/** Carga una señal simple de 6 s con picos cada 1 s (60 BPM). */
async function loadBasicSignal() {
  const input = screen.getByLabelText(/Cargar archivo CSV/i);
  const fs = 250;
  const peaks = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
  const rows: string[] = ["time,value"];
  for (let i = 0; i < 6 * fs; i++) {
    const t = i / fs;
    let v = 0;
    for (const p of peaks) v += Math.exp(-((t - p) ** 2) / (2 * 0.01 * 0.01));
    rows.push(`${t.toFixed(4)},${v.toFixed(4)}`);
  }
  fireEvent.change(input, { target: { files: [csvFile("ecg.csv", rows.join("\n"))] } });
  await waitFor(() => expect(screen.getByTestId("ecg-chart")).toBeInTheDocument());
}

describe("MainPage — Espectro (feature 004)", () => {
  it("activar 'Espectro' muestra el gráfico de espectro en vez del trazado", async () => {
    render(<MainPage />);
    await loadBasicSignal();

    fireEvent.click(screen.getByRole("button", { name: /^espectro$/i }));

    await waitFor(() =>
      expect(screen.getByTestId("spectrum-chart")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("ecg-chart")).toBeNull();
    expect(spectrumApi.computeSpectrum).toHaveBeenCalledTimes(1);
  });

  it("desactivar 'Espectro' vuelve a mostrar el trazado", async () => {
    render(<MainPage />);
    await loadBasicSignal();

    const toggle = () => screen.getByRole("button", { name: /^espectro$/i });
    fireEvent.click(toggle());
    await waitFor(() =>
      expect(screen.getByTestId("spectrum-chart")).toBeInTheDocument()
    );

    fireEvent.click(toggle());
    expect(screen.getByTestId("ecg-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("spectrum-chart")).toBeNull();
  });

  it("con 'Espectro' activo, aplicar un filtro recalcula el espectro solo (FR-005)", async () => {
    render(<MainPage />);
    await loadBasicSignal();

    fireEvent.click(screen.getByRole("button", { name: /^espectro$/i }));
    await waitFor(() => expect(spectrumApi.computeSpectrum).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /aplicar filtro/i }));

    await waitFor(() => expect(filterApi.applyFilter).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(spectrumApi.computeSpectrum).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("spectrum-chart")).toBeInTheDocument();
  });

  it("con 'Detec. Complejos' y 'Espectro' activos a la vez, no aparece el trazado ni sus marcas (FR-006)", async () => {
    render(<MainPage />);
    await loadBasicSignal();

    fireEvent.click(screen.getByRole("button", { name: /detec\. complejos/i }));
    fireEvent.click(screen.getByRole("button", { name: /^espectro$/i }));

    await waitFor(() =>
      expect(screen.getByTestId("spectrum-chart")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("ecg-chart")).toBeNull();
  });

  it("ante una ventana insuficiente, muestra un aviso en vez del gráfico de espectro (FR-009)", async () => {
    vi.mocked(spectrumApi.computeSpectrum).mockRejectedValueOnce(
      new ApiRequestError({
        code: "INSUFFICIENT_SAMPLES",
        message: "Se necesitan al menos 8 muestras.",
      })
    );
    render(<MainPage />);
    await loadBasicSignal();

    fireEvent.click(screen.getByRole("button", { name: /^espectro$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/8 muestras/i);
    });
    expect(screen.queryByTestId("spectrum-chart")).toBeNull();
  });
});
