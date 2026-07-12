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
}

/// <summary>Configuración de un filtro digital y sus frecuencias de corte (Hz).</summary>
public record FilterConfigDto(FilterType Type, double? CutoffLow, double? CutoffHigh);

public record FilterRequest(SignalDto Signal, FilterConfigDto Filter);
public record FilterResponse(SignalDto Signal);

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
}
