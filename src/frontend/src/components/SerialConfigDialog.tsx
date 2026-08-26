import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { getNavigatorSerial, type SerialPortLike } from "../serial/webSerialTypes";

/** Configuración elegida en el diálogo: el puerto ya abierto por Web Serial API. */
export interface SerialConnectionConfig {
  port: SerialPortLike;
  baudRate: number;
}

/** Velocidad por defecto en baudios (FR-003). */
export const DEFAULT_BAUD_RATE = 115200;

interface Props {
  open: boolean;
  onConfirm: (config: SerialConnectionConfig) => void;
  onCancel: () => void;
  /**
   * Dispara el selector nativo del navegador (`navigator.serial.requestPort`).
   * Inyectable para tests; `null` cuando el navegador no soporta Web Serial API.
   */
  requestPort?: (() => Promise<SerialPortLike>) | null;
}

/**
 * Diálogo "Configuración" del área "Conectarse" (feature 005): el puerto se
 * elige con el selector nativo del navegador (Web Serial API) — la app no
 * mantiene su propia lista de puertos, el backend no participa (correría en
 * un contenedor, sin acceso al hardware de quien usa la app).
 */
export function SerialConfigDialog({
  open,
  onConfirm,
  onCancel,
  requestPort = () => getNavigatorSerial()?.requestPort() ?? Promise.reject(),
}: Props) {
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [baudRate, setBaudRate] = useState(DEFAULT_BAUD_RATE);

  useEffect(() => {
    if (!open) return;
    setPort(null);
    setBaudRate(DEFAULT_BAUD_RATE);
  }, [open]);

  if (!open) return null;

  const supported = requestPort !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configuración de conexión"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        {!supported ? (
          <p role="alert" className="text-sm text-destructive">
            Tu navegador no soporta la Web Serial API (necesaria para
            conectarse al hardware del ECG). Usá Chrome, Edge u Opera.
          </p>
        ) : (
          <>
            <p className="mt-0 mb-2 text-sm font-medium">Dispositivo</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => requestPort().then(setPort)}
            >
              Elegir dispositivo
            </Button>
            {port && (
              <p className="mt-2 text-xs text-muted-foreground">
                Dispositivo seleccionado.
              </p>
            )}

            <p className="mt-4 mb-2 text-sm font-medium">
              Velocidad (baudios)
            </p>
            <Input
              type="number"
              aria-label="Velocidad (baudios)"
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
            />
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => port && onConfirm({ port, baudRate })}
            disabled={!port}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
