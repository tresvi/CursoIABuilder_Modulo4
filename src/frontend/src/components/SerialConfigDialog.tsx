import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

/** Configuración elegida en el diálogo (data-model.md ConnectionConfig). */
export interface SerialConnectionConfig {
  port: string;
  baudRate: number;
}

/** Velocidad por defecto en baudios (FR-003). */
export const DEFAULT_BAUD_RATE = 115200;

interface Props {
  open: boolean;
  ports: string[];
  onConfirm: (config: SerialConnectionConfig) => void;
  onCancel: () => void;
}

/**
 * Diálogo "Configuración" del área "Conectarse" (US1): elegir puerto COM y
 * velocidad, con 115200 baudios preseleccionados.
 */
export function SerialConfigDialog({ open, ports, onConfirm, onCancel }: Props) {
  const [port, setPort] = useState(ports[0] ?? "");
  const [baudRate, setBaudRate] = useState(DEFAULT_BAUD_RATE);

  useEffect(() => {
    if (!open) return;
    setPort(ports[0] ?? "");
    setBaudRate(DEFAULT_BAUD_RATE);
  }, [open, ports]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuración de conexión"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <p className="mt-0 mb-2 text-sm font-medium">Puerto</p>
        <Select
          aria-label="Puerto"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        >
          {ports.length === 0 && <option value="">Sin puertos disponibles</option>}
          {ports.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        <p className="mt-4 mb-2 text-sm font-medium">Velocidad (baudios)</p>
        <Input
          type="number"
          aria-label="Velocidad (baudios)"
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ port, baudRate })}
            disabled={!port}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
