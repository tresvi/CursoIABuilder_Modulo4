using ECGViewer.Api.Models;

namespace ECGViewer.Api.Dsp;

/// <summary>
/// Filtros DSP (RF-10) sobre la señal, usando FftSharp. Operación no destructiva:
/// recibe las muestras y devuelve un arreglo nuevo filtrado (Principio II).
/// El notch (band-stop) se implementa como `valores - bandpass(low, high)`.
/// </summary>
public static class SignalFilter
{
    public sealed record ValidationError(string Message);

    /// <summary>
    /// Valida los parámetros del filtro contra la frecuencia de Nyquist (fs/2).
    /// Devuelve null si son válidos, o el error a reportar (INVALID_FILTER_PARAMS).
    /// </summary>
    public static ValidationError? Validate(double fs, FilterType type, double? low, double? high)
    {
        if (fs <= 0)
            return new ValidationError("Frecuencia de muestreo inválida (fs <= 0).");
        var nyquist = fs / 2.0;

        bool NeedsLow() => type is FilterType.HighPass or FilterType.BandPass or FilterType.Notch;
        bool NeedsHigh() => type is FilterType.LowPass or FilterType.BandPass or FilterType.Notch;

        if (NeedsLow() && (low is null || low <= 0 || low >= nyquist))
            return new ValidationError($"El corte inferior debe estar en (0, {nyquist} Hz).");
        if (NeedsHigh() && (high is null || high <= 0 || high >= nyquist))
            return new ValidationError($"El corte superior debe estar en (0, {nyquist} Hz).");
        if (type is FilterType.BandPass or FilterType.Notch && low >= high)
            return new ValidationError("El corte inferior debe ser menor que el superior.");

        return null;
    }

    /// <summary>Aplica el filtro a las amplitudes. Asume parámetros ya validados.</summary>
    public static double[] Apply(double[] values, double fs, FilterType type, double? low, double? high)
    {
        return type switch
        {
            FilterType.LowPass => FftSharp.Filter.LowPass(values, fs, high!.Value),
            FilterType.HighPass => FftSharp.Filter.HighPass(values, fs, low!.Value),
            FilterType.BandPass => FftSharp.Filter.BandPass(values, fs, low!.Value, high!.Value),
            FilterType.Notch => BandStop(values, fs, low!.Value, high!.Value),
            _ => throw new ArgumentOutOfRangeException(nameof(type)),
        };
    }

    private static double[] BandStop(double[] values, double fs, double low, double high)
    {
        var band = FftSharp.Filter.BandPass(values, fs, low, high);
        var result = new double[values.Length];
        for (var i = 0; i < values.Length; i++)
            result[i] = values[i] - band[i];
        return result;
    }
}
