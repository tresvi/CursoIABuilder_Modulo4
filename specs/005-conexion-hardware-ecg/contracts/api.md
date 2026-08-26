# Contrato — Conexión al hardware del ECG por puerto serie

Esta feature **no agrega ningún endpoint al backend** (research.md D1): el
puerto serie se abre y se lee enteramente en el navegador con la Web Serial
API (`navigator.serial`), porque el backend corre en un contenedor sin acceso
al hardware físico de quien usa la app.

El "contrato" equivalente es la interfaz del hook de React
`src/frontend/src/hooks/useSerialConnection.ts`:

```ts
interface UseSerialConnection {
  status: "idle" | "connected" | "stopped" | "error";
  reason: string | null; // "TIME_LIMIT" | "DEVICE_DISCONNECTED" | null
  samples: { t: number; v: number }[]; // ya escaladas a mV, t = n/250 (D4/D5)
  connect: (config: { port: SerialPortLike; baudRate: number }) => Promise<void>;
  disconnect: () => Promise<void>;
}
```

- `port` se obtiene con `navigator.serial.requestPort()` (selector nativo del
  navegador) desde el diálogo "Configuración" — la app nunca arma su propia
  lista de puertos.
- `samples` se actualiza en lotes cada ~100 ms mientras `status === "connected"`
  (research.md D2), evitando un render por línea recibida a 250 Hz.
- Una línea del puerto que no es un entero se descarta sin cambiar `status`
  (FR-008).
- `status` pasa a `"stopped"`/`reason: "TIME_LIMIT"` sola a las 300 000
  muestras válidas (FR-013, D6), o a `"error"`/`reason: "DEVICE_DISCONNECTED"`
  si el stream del puerto se corta inesperadamente (FR-009).
