import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  open: boolean;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

/** Máximo de caracteres del texto de un marcador (FR-011). */
export const MARKER_TEXT_MAX = 255;

/**
 * Pide el texto del marcador al hacer click con la herramienta "Marcar" (US6).
 * Si el usuario cancela, no se crea el marcador; si acepta, se efectúa la marca
 * con el texto ingresado (hasta {@link MARKER_TEXT_MAX} caracteres).
 */
export function MarkerPromptDialog({ open, onConfirm, onCancel }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reinicia el campo y enfoca el input cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setText("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo marcador"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <p className="mt-0 mb-2 text-sm font-medium">Texto del marcador</p>
        <Input
          ref={inputRef}
          type="text"
          value={text}
          maxLength={MARKER_TEXT_MAX}
          aria-label="Texto del marcador"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(text);
            if (e.key === "Escape") onCancel();
          }}
        />
        <small className="mt-1 block text-xs text-muted-foreground">
          {text.length}/{MARKER_TEXT_MAX}
        </small>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(text)}>Aceptar</Button>
        </div>
      </div>
    </div>
  );
}
