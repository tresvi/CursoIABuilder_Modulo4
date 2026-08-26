using ECGViewer.Api.Models;

namespace ECGViewer.Api.Dsp;

/// <summary>
/// Espectro de potencia (feature 004) vía FftSharp. Operación de solo lectura: no
/// modifica la señal de entrada (Principio II) ni depende de la vista visible que
/// eligió el llamador — recibe exactamente las muestras que debe transformar
/// (research.md D2: el frontend ya recorta a la ventana visible antes de llamar).
/// </summary>
public static class PowerSpectrum
{
    /// <summary>Mínimo de muestras para un espectro con sentido (FR-009).</summary>
    public const int MinSamples = 8;

    public static bool HasEnoughSamples(int sampleCount) => sampleCount >= MinSamples;

    /// <summary>
    /// Calcula el espectro de potencia unilateral (0 a fs/2) de `values`. FftSharp
    /// exige longitud potencia de 2; se rellena con ceros hasta la siguiente potencia
    /// (estándar para análisis espectral, a diferencia del relleno por reflejo que usa
    /// `SignalFilter` para filtrar sin introducir escalones).
    /// </summary>
    public static IReadOnlyList<SpectrumPointDto> Compute(double[] values, double fs)
    {
        if (values.Length == 0)
            return [];

        var padded = new double[NextPowerOfTwo(values.Length)];
        Array.Copy(values, padded, values.Length);

        var spectrum = FftSharp.FFT.Forward(padded);
        // Unilateral (0..Nyquist): Magnitude(..., true) devuelve N/2+1 bins.
        var magnitude = FftSharp.FFT.Magnitude(spectrum, true);

        // Frecuencia de cada bin = i * fs / N. No se usa FftSharp.FFT.FrequencyScale
        // porque con onesided=true devuelve un arreglo de longitud N (no N/2+1) con la
        // escala comprimida a [0, fs/2] — desalinea el índice respecto de Magnitude.
        var points = new SpectrumPointDto[magnitude.Length];
        for (var i = 0; i < magnitude.Length; i++)
            points[i] = new SpectrumPointDto(i * fs / padded.Length, magnitude[i]);
        return points;
    }

    private static int NextPowerOfTwo(int n)
    {
        var p = 1;
        while (p < n)
            p *= 2;
        return p;
    }
}
