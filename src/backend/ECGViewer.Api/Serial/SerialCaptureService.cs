using ECGViewer.Api.Models;

namespace ECGViewer.Api.Serial;

/// <summary>Se lanza si se pide conectar mientras ya hay una conexión activa (research.md D9).</summary>
public sealed class AlreadyConnectedException : Exception { }

/// <summary>
/// Singleton con el estado de la única conexión serie posible a la vez
/// (data-model.md). Numera las muestras válidas a 250 Hz (D5), las escala a mV
/// (D4, <see cref="SampleScaling"/>) y corta sola a las 300 000 muestras
/// (20 minutos, D6). Las líneas no numéricas se descartan sin cortar la
/// conexión (FR-008).
/// </summary>
public sealed class SerialCaptureService
{
    private const int SampleLimit = 300_000;
    private const double SampleRateHz = 250.0;

    private readonly ISerialLineSource _source;
    private readonly List<SerialStreamSampleDto> _samples = [];
    private readonly Lock _lock = new();

    public SerialCaptureService(ISerialLineSource source)
    {
        _source = source;
        _source.LineReceived += OnLineReceived;
        _source.Disconnected += OnDisconnected;
    }

    public CaptureStatus Status { get; private set; } = CaptureStatus.Idle;
    public string? Reason { get; private set; }

    /// <summary>Notifica que hay nuevas muestras y/o cambió el estado (para el stream SSE).</summary>
    public event Action? Changed;

    public IReadOnlyList<SerialStreamSampleDto> Samples
    {
        get
        {
            lock (_lock)
                return [.. _samples];
        }
    }

    public void Connect(string portName, int baudRate)
    {
        if (Status == CaptureStatus.Connected)
            throw new AlreadyConnectedException();

        lock (_lock)
            _samples.Clear();
        Reason = null;
        Status = CaptureStatus.Connected;
        _source.Open(portName, baudRate);
        Changed?.Invoke();
    }

    public void Disconnect()
    {
        if (Status != CaptureStatus.Connected)
            return;
        Stop(CaptureStatus.Stopped, null);
    }

    private void OnLineReceived(string line)
    {
        if (Status != CaptureStatus.Connected)
            return;
        if (!int.TryParse(line, out var count))
            return;

        int index;
        lock (_lock)
        {
            index = _samples.Count;
            _samples.Add(new SerialStreamSampleDto(index / SampleRateHz, SampleScaling.ToMillivolts(count)));
        }

        if (index + 1 >= SampleLimit)
            Stop(CaptureStatus.Stopped, "TIME_LIMIT");
        else
            Changed?.Invoke();
    }

    private void OnDisconnected() => Stop(CaptureStatus.Error, "DEVICE_DISCONNECTED");

    private void Stop(CaptureStatus status, string? reason)
    {
        if (Status != CaptureStatus.Connected)
            return;
        Status = status;
        Reason = reason;
        _source.Close();
        Changed?.Invoke();
    }
}
