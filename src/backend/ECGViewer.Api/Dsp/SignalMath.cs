using ECGViewer.Api.Models;

namespace ECGViewer.Api.Dsp;

/// <summary>Utilidades de dominio sobre la señal (paralelo al frontend).</summary>
public static class SignalMath
{
    /// <summary>Deriva la frecuencia de muestreo desde la mediana de Δt (research.md D7).</summary>
    public static double DeriveFs(IReadOnlyList<SampleDto> samples)
    {
        if (samples.Count < 2)
            return 0;
        var deltas = new List<double>(samples.Count - 1);
        for (var i = 1; i < samples.Count; i++)
        {
            var dt = samples[i].T - samples[i - 1].T;
            if (dt > 0)
                deltas.Add(dt);
        }
        if (deltas.Count == 0)
            return 0;
        deltas.Sort();
        var mid = deltas.Count / 2;
        var median = deltas.Count % 2 == 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];
        return median > 0 ? 1.0 / median : 0;
    }

    /// <summary>Resuelve la fs: usa la provista si es válida, o la deriva.</summary>
    public static double ResolveFs(SignalDto signal) =>
        signal.Fs is > 0 ? signal.Fs.Value : DeriveFs(signal.Samples);
}
