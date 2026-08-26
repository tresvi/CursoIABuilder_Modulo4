namespace ECGViewer.Api.Serial;

/// <summary>
/// Abstracción sobre una fuente de líneas de texto por puerto serie (feature 005).
/// Permite reemplazar el hardware real por una fuente simulada en los tests —
/// el puerto serie NUNCA se abre de verdad en un test automatizado (Principio I,
/// mismo criterio que "los tests nunca llaman a la API real de Claude").
/// </summary>
public interface ISerialLineSource
{
    /// <summary>Nombres de los puertos disponibles en el sistema (FR-002).</summary>
    IReadOnlyList<string> GetPortNames();

    /// <summary>
    /// Abre el puerto a la velocidad dada (FR-004). Lanza si el puerto no existe o
    /// el sistema operativo no puede abrirlo (ocupado, sin permisos, etc.).
    /// </summary>
    void Open(string portName, int baudRate);

    /// <summary>Cierra el puerto si está abierto (FR-010). Idempotente.</summary>
    void Close();

    /// <summary>Se dispara con cada línea recibida, sin el salto de línea (FR-005).</summary>
    event Action<string>? LineReceived;

    /// <summary>
    /// Se dispara si el puerto se desconecta o falla inesperadamente mientras
    /// estaba abierto (FR-009) — nunca por un cierre pedido vía <see cref="Close"/>.
    /// </summary>
    event Action? Disconnected;
}
