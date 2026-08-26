/**
 * Superficie mínima de la Web Serial API que usamos (`lib.dom.d.ts` no la
 * incluye: es no estándar, solo Chromium). Definir esta interfaz propia
 * permite inyectar una implementación falsa en tests, igual que con el
 * Worker inyectable de la feature 003 o el EventSource inyectable original
 * de esta misma feature.
 */
export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}

export interface NavigatorSerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

/** `navigator.serial`, si el navegador la soporta (Chrome/Edge/Opera). */
export function getNavigatorSerial(): NavigatorSerialLike | null {
  const nav = navigator as unknown as { serial?: NavigatorSerialLike };
  return nav.serial ?? null;
}

/** La conexión al hardware del ECG requiere Web Serial API (feature 005). */
export function isWebSerialSupported(): boolean {
  return getNavigatorSerial() !== null;
}
