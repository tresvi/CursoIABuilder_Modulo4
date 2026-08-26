namespace ECGViewer.Api.Serial;

/// <summary>Estado de la única conexión posible a la vez (data-model.md).</summary>
public enum CaptureStatus
{
    Idle,
    Connected,
    Stopped,
    Error,
}
