using ECGViewer.Api.Dsp;

namespace ECGViewer.Tests;

public class PowerSpectrumTests
{
    private const double Fs = 500.0;
    private const int N = 1024;

    private static double[] Sinusoid(double freq)
    {
        var x = new double[N];
        for (var i = 0; i < N; i++)
            x[i] = Math.Sin(2 * Math.PI * freq * i / Fs);
        return x;
    }

    [Fact]
    public void Compute_concentra_la_potencia_cerca_de_la_frecuencia_de_una_senoidal_pura()
    {
        var x = Sinusoid(50);
        var points = PowerSpectrum.Compute(x, Fs);

        Assert.NotEmpty(points);
        // ordenado por frecuencia creciente, hasta Nyquist (Fs/2)
        for (var i = 1; i < points.Count; i++)
            Assert.True(points[i].Frequency > points[i - 1].Frequency);
        Assert.True(points[^1].Frequency <= Fs / 2 + 1e-6);

        var peak = points.OrderByDescending(p => p.Power).First();
        Assert.True(
            Math.Abs(peak.Frequency - 50) < 2.0,
            $"el pico debería estar cerca de 50 Hz, dio {peak.Frequency}"
        );
    }

    [Fact]
    public void Compute_sobre_señal_vacia_no_lanza_y_devuelve_vacio()
    {
        var points = PowerSpectrum.Compute([], Fs);
        Assert.Empty(points);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, false)]
    [InlineData(7, false)]
    [InlineData(8, true)]
    [InlineData(100, true)]
    public void HasEnoughSamples_exige_un_minimo_de_muestras(int count, bool expected)
    {
        Assert.Equal(expected, PowerSpectrum.HasEnoughSamples(count));
    }
}
