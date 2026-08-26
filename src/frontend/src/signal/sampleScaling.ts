/**
 * Escalado del entero recibido por el puerto serie a mV (feature 005, FR-006).
 * Span = (10-0)/(4095-0), Zero = 0.
 */
const SPAN = (10 - 0) / (4095 - 0);
const ZERO = 0;

export function toMillivolts(count: number): number {
  return count * SPAN + ZERO;
}
