import { createSignal, type Sample, type Signal } from "./signalModel";

export type ParseErrorCode =
  | "INVALID_SIGNAL"
  | "MULTICHANNEL_NOT_SUPPORTED";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
}

export type ParseResult =
  | { ok: true; signal: Signal }
  | { ok: false; error: ParseError };

function fail(code: ParseErrorCode, message: string): ParseResult {
  return { ok: false, error: { code, message } };
}

/** Detecta el separador de columnas a partir del encabezado. */
function detectSeparator(headerLine: string): ";" | "," {
  return headerLine.includes(";") ? ";" : ",";
}

/** Parsea un número que puede venir con coma decimal cuando el separador es ';'. */
function parseNumber(raw: string, sep: ";" | ","): number {
  const normalized = sep === ";" ? raw.replace(",", ".") : raw;
  return Number(normalized.trim());
}

/**
 * Parsea un CSV de ECG monocanal. La primera línea es el encabezado con dos
 * columnas (tiempo, valor). Devuelve la señal o un error tipado.
 * FR-001/FR-002, AC-01/02/03.
 */
export function parseCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return fail("INVALID_SIGNAL", "El archivo está vacío.");
  }
  if (lines.length < 2) {
    return fail(
      "INVALID_SIGNAL",
      "El archivo solo contiene el encabezado, sin datos."
    );
  }

  const sep = detectSeparator(lines[0]);
  const headerCols = lines[0].split(sep);

  if (headerCols.length < 2) {
    return fail(
      "INVALID_SIGNAL",
      "El encabezado debe tener columnas de tiempo y valor."
    );
  }
  if (headerCols.length > 2) {
    return fail(
      "MULTICHANNEL_NOT_SUPPORTED",
      "El archivo tiene más de un canal; solo se soporta un canal."
    );
  }

  const samples: Sample[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length !== 2) {
      if (cols.length > 2) {
        return fail(
          "MULTICHANNEL_NOT_SUPPORTED",
          `La fila ${i + 1} tiene más de un canal; solo se soporta un canal.`
        );
      }
      return fail(
        "INVALID_SIGNAL",
        `La fila ${i + 1} no tiene columnas de tiempo y valor.`
      );
    }
    const t = parseNumber(cols[0], sep);
    const v = parseNumber(cols[1], sep);
    if (!Number.isFinite(t) || !Number.isFinite(v)) {
      return fail(
        "INVALID_SIGNAL",
        `La fila ${i + 1} contiene valores no numéricos.`
      );
    }
    samples.push({ t, v });
  }

  if (samples.length === 0) {
    return fail("INVALID_SIGNAL", "El archivo no contiene datos válidos.");
  }

  return { ok: true, signal: createSignal(samples) };
}
