using ECGViewer.Api.Serial;

namespace ECGViewer.Tests;

/// <summary>
/// Fuente de líneas simulada para los tests de la feature 005 — el puerto serie
/// NUNCA se abre de verdad en un test automatizado (Principio I).
/// </summary>
public sealed class FakeSerialLineSource : ISerialLineSource
{
    public List<string> PortNames { get; set; } = [];
    public bool IsOpen { get; private set; }
    public string? OpenedPort { get; private set; }
    public int? OpenedBaudRate { get; private set; }

    /// <summary>Si se setea, `Open` lanza esta excepción en vez de abrir.</summary>
    public Exception? ThrowOnOpen { get; set; }

    public event Action<string>? LineReceived;
    public event Action? Disconnected;

    public IReadOnlyList<string> GetPortNames() => PortNames;

    public void Open(string portName, int baudRate)
    {
        if (ThrowOnOpen is { } ex)
            throw ex;
        IsOpen = true;
        OpenedPort = portName;
        OpenedBaudRate = baudRate;
    }

    public void Close() => IsOpen = false;

    /// <summary>Simula que llegó una línea por el puerto (test-only).</summary>
    public void EmitLine(string line) => LineReceived?.Invoke(line);

    /// <summary>Simula una desconexión inesperada del dispositivo (test-only).</summary>
    public void EmitDisconnected() => Disconnected?.Invoke();
}
