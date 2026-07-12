interface Props {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Cartel de confirmación reutilizable (recorte AC-13, y otros flujos). */
export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
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
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ marginTop: 0 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ fontWeight: 600 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
