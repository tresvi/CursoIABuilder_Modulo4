import { useEffect, useRef, useState } from "react";

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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ marginTop: 0 }}>Texto del marcador</p>
        <input
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
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 6,
            fontSize: 14,
          }}
        />
        <small style={{ color: "#666", display: "block", marginTop: 4 }}>
          {text.length}/{MARKER_TEXT_MAX}
        </small>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <button onClick={onCancel}>Cancelar</button>
          <button onClick={() => onConfirm(text)} style={{ fontWeight: 600 }}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
