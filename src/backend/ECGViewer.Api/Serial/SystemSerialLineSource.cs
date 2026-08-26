using System.IO.Ports;

namespace ECGViewer.Api.Serial;

/// <summary>
/// Implementación real de <see cref="ISerialLineSource"/> vía
/// <see cref="System.IO.Ports.SerialPort"/> (feature 005). Nunca se instancia
/// en tests automatizados — ahí se usa una fuente simulada (ver
/// <c>ISerialLineSource</c> y `FakeSerialLineSource` en el proyecto de tests).
/// </summary>
public sealed class SystemSerialLineSource : ISerialLineSource, IDisposable
{
    private SerialPort? _port;

    public event Action<string>? LineReceived;
    public event Action? Disconnected;

    public IReadOnlyList<string> GetPortNames() => SerialPort.GetPortNames();

    public void Open(string portName, int baudRate)
    {
        Close();
        var port = new SerialPort(portName, baudRate) { NewLine = "\n" };
        port.ErrorReceived += (_, _) => Disconnected?.Invoke();
        port.DataReceived += OnDataReceived;
        port.Open();
        _port = port;
    }

    private void OnDataReceived(object sender, SerialDataReceivedEventArgs e)
    {
        var port = _port;
        if (port is null) return;
        try
        {
            while (port.IsOpen && port.BytesToRead > 0)
                LineReceived?.Invoke(port.ReadLine());
        }
        catch (TimeoutException)
        {
            // sin más datos disponibles por ahora
        }
        catch (Exception)
        {
            Disconnected?.Invoke();
        }
    }

    public void Close()
    {
        var port = _port;
        _port = null;
        if (port is null)
            return;
        port.DataReceived -= OnDataReceived;
        try
        {
            if (port.IsOpen)
                port.Close();
        }
        catch
        {
            // ya estaba cerrado o desconectado; no hay nada más que hacer
        }
        port.Dispose();
    }

    public void Dispose() => Close();
}
