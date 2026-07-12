import type { EventMarker } from "../signal/markers";

interface Props {
  markers: EventMarker[];
  onEdit: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}

/** Lista de marcadores con edición de etiqueta y eliminación (US6, AC-06/07). */
export function MarkerEditor({ markers, onEdit, onRemove }: Props) {
  if (markers.length === 0) {
    return (
      <p style={{ color: "#666" }} data-testid="markers-empty">
        Sin marcadores. Activá la herramienta “Marcar” y hacé clic sobre el
        gráfico.
      </p>
    );
  }
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  return (
    <ul style={{ listStyle: "none", padding: 0 }} data-testid="marker-list">
      {sorted.map((m) => (
        <li
          key={m.id}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 64 }}>
            {m.time.toFixed(3)} s
          </span>
          <input
            aria-label={`Etiqueta del marcador en ${m.time.toFixed(3)} s`}
            value={m.label}
            placeholder="etiqueta…"
            onChange={(e) => onEdit(m.id, e.target.value)}
          />
          <button
            aria-label={`Eliminar marcador en ${m.time.toFixed(3)} s`}
            onClick={() => onRemove(m.id)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
