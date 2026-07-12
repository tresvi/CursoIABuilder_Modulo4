using ECGViewer.Api.Dsp;
using ECGViewer.Api.Models;

namespace ECGViewer.Tests;

public class DspFilterTests
{
    private const double Fs = 500.0;
    private const int N = 2048;

    /// <summary>Señal = sin(2π·f1·t) + sin(2π·f2·t).</summary>
    private static double[] TwoTone(double f1, double f2)
    {
        var x = new double[N];
        for (var i = 0; i < N; i++)
        {
            var t = i / Fs;
            x[i] = Math.Sin(2 * Math.PI * f1 * t) + Math.Sin(2 * Math.PI * f2 * t);
        }
        return x;
    }

    /// <summary>Magnitud (amplitud) de la componente a `freq` Hz vía Goertzel.</summary>
    private static double Magnitude(double[] x, double freq)
    {
        var k = 2 * Math.Cos(2 * Math.PI * freq / Fs);
        double s0, s1 = 0, s2 = 0;
        foreach (var sample in x)
        {
            s0 = sample + k * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        var real = s1 - s2 * Math.Cos(2 * Math.PI * freq / Fs);
        var imag = s2 * Math.Sin(2 * Math.PI * freq / Fs);
        return 2.0 * Math.Sqrt(real * real + imag * imag) / x.Length;
    }

    [Fact]
    public void LowPass_atenua_la_alta_y_conserva_la_baja()
    {
        var x = TwoTone(5, 50);
        var y = SignalFilter.Apply(x, Fs, FilterType.LowPass, null, 20);
        Assert.True(Magnitude(y, 5) > 0.8, "debe conservar 5 Hz");
        Assert.True(Magnitude(y, 50) < 0.15, "debe atenuar 50 Hz");
    }

    [Fact]
    public void HighPass_atenua_la_baja_y_conserva_la_alta()
    {
        var x = TwoTone(5, 50);
        var y = SignalFilter.Apply(x, Fs, FilterType.HighPass, 20, null);
        Assert.True(Magnitude(y, 50) > 0.8, "debe conservar 50 Hz");
        Assert.True(Magnitude(y, 5) < 0.15, "debe atenuar 5 Hz");
    }

    [Fact]
    public void BandPass_conserva_la_media_y_atenua_los_extremos()
    {
        // 2 Hz + 25 Hz + 120 Hz; banda 10–40 debe conservar solo 25 Hz.
        var x = new double[N];
        for (var i = 0; i < N; i++)
        {
            var t = i / Fs;
            x[i] = Math.Sin(2 * Math.PI * 2 * t) + Math.Sin(2 * Math.PI * 25 * t) + Math.Sin(2 * Math.PI * 120 * t);
        }
        var y = SignalFilter.Apply(x, Fs, FilterType.BandPass, 10, 40);
        Assert.True(Magnitude(y, 25) > 0.8, "conserva 25 Hz");
        Assert.True(Magnitude(y, 2) < 0.15, "atenúa 2 Hz");
        Assert.True(Magnitude(y, 120) < 0.15, "atenúa 120 Hz");
    }

    [Fact]
    public void Notch_elimina_la_banda_y_conserva_el_resto()
    {
        var x = TwoTone(5, 50);
        var y = SignalFilter.Apply(x, Fs, FilterType.Notch, 45, 55);
        Assert.True(Magnitude(y, 5) > 0.8, "conserva 5 Hz");
        Assert.True(Magnitude(y, 50) < 0.15, "elimina 50 Hz");
    }

    [Fact]
    public void Apply_no_muta_el_arreglo_de_entrada()
    {
        var x = TwoTone(5, 50);
        var copy = (double[])x.Clone();
        _ = SignalFilter.Apply(x, Fs, FilterType.LowPass, null, 20);
        Assert.Equal(copy, x);
    }

    [Theory]
    [InlineData(FilterType.BandPass, 40.0, 10.0)] // low >= high
    [InlineData(FilterType.LowPass, null, 300.0)] // >= Nyquist (250)
    [InlineData(FilterType.HighPass, 0.0, null)] // <= 0
    public void Validate_rechaza_parametros_invalidos(FilterType type, double? low, double? high)
    {
        Assert.NotNull(SignalFilter.Validate(Fs, type, low, high));
    }

    [Fact]
    public void Validate_acepta_parametros_correctos()
    {
        Assert.Null(SignalFilter.Validate(Fs, FilterType.BandPass, 10, 40));
    }
}
