using System.Text.Json.Serialization;

namespace ECGViewer.Api.Models;

/// <summary>Una muestra de la señal: tiempo en segundos, amplitud en mV.</summary>
public record SampleDto(double T, double V);

/// <summary>Señal ECG monocanal. `Fs` es opcional; el backend la deriva si falta.</summary>
public record SignalDto(IReadOnlyList<SampleDto> Samples, double? Fs = null);

/// <summary>Tipos de filtro digital soportados (RF-10).</summary>
public enum FilterType
{
    [JsonStringEnumMemberName("lowpass")]
    LowPass,

    [JsonStringEnumMemberName("highpass")]
    HighPass,

    [JsonStringEnumMemberName("bandpass")]
    BandPass,

    [JsonStringEnumMemberName("notch")]
    Notch,

    [JsonStringEnumMemberName("movingaverage")]
    MovingAverage,

    [JsonStringEnumMemberName("median")]
    Median,

    [JsonStringEnumMemberName("savgol")]
    SavitzkyGolay,
}

/// <summary>
/// Configuración de un filtro digital. Los filtros FFT usan las frecuencias de corte
/// (Hz); los filtros de tiempo (media móvil, mediana, Savitzky–Golay) usan
/// <see cref="Window"/> en muestras y, para Savitzky–Golay, <see cref="PolyOrder"/>.
/// </summary>
public record FilterConfigDto(
    FilterType Type,
    double? CutoffLow,
    double? CutoffHigh,
    int? Window = null,
    int? PolyOrder = null
);

public record FilterRequest(SignalDto Signal, FilterConfigDto Filter);
public record FilterResponse(SignalDto Signal);

/// <summary>Un punto del espectro de potencia: frecuencia (Hz) y su potencia.</summary>
public record SpectrumPointDto(double Frequency, double Power);

/// <summary>Espectro de potencia completo, ordenado por frecuencia creciente hasta Nyquist (fs/2).</summary>
public record SpectrumDto(IReadOnlyList<SpectrumPointDto> Points);

public record SpectrumRequest(SignalDto Signal);
public record SpectrumResponse(SpectrumDto Spectrum);

/// <summary>Lista de puertos serie disponibles (feature 005).</summary>
public record SerialPortsResponse(IReadOnlyList<string> Ports);

/// <summary>Pedido para abrir un puerto serie a una velocidad dada (default 115200).</summary>
public record SerialConnectRequest(string Port, int BaudRate);

/// <summary>Una muestra ya escalada a mV, con su instante (t = n/250, research.md D5).</summary>
public record SerialStreamSampleDto(double T, double V);

/// <summary>Un lote del stream de captura en vivo (contracts/api.md, ~cada 100 ms).</summary>
public record SerialStreamEventDto(
    IReadOnlyList<SerialStreamSampleDto> Samples,
    string Status,
    string? Reason
);

public record MarkerDto(string Id, double Time, string Label);
public record CropDto(double FromTime, double ToTime);

/// <summary>Estudio guardado: señal original + marcadores + filtro + recorte.</summary>
public record StudyDto(
    SignalDto Signal,
    IReadOnlyList<MarkerDto> Markers,
    FilterConfigDto? Filter,
    CropDto? Crop,
    DateTimeOffset? SavedAt = null
);

public record SaveStudyResponse(DateTimeOffset SavedAt);

/// <summary>Formato uniforme de error de la API (contracts/api.md).</summary>
public record ApiError(string Code, string Message);
public record ErrorResponse(ApiError Error);

public static class ErrorCodes
{
    public const string InvalidSignal = "INVALID_SIGNAL";
    public const string MultichannelNotSupported = "MULTICHANNEL_NOT_SUPPORTED";
    public const string InvalidXlsx = "INVALID_XLSX";
    public const string InvalidFilterParams = "INVALID_FILTER_PARAMS";
    public const string NotFound = "NOT_FOUND";
    public const string InsufficientSamples = "INSUFFICIENT_SAMPLES";
    public const string PortNotFound = "PORT_NOT_FOUND";
    public const string AlreadyConnected = "ALREADY_CONNECTED";
    public const string PortUnavailable = "PORT_UNAVAILABLE";
}
