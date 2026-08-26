using ECGViewer.Api.Serial;

namespace ECGViewer.Tests;

public class SampleScalingTests
{
    [Fact]
    public void ToMillivolts_cuenta_0_da_0mV()
    {
        Assert.Equal(0.0, SampleScaling.ToMillivolts(0), 6);
    }

    [Fact]
    public void ToMillivolts_cuenta_2048_da_aproximadamente_5mV()
    {
        Assert.Equal(5.0, SampleScaling.ToMillivolts(2048), 2);
    }

    [Fact]
    public void ToMillivolts_cuenta_4095_da_aproximadamente_10mV()
    {
        Assert.Equal(10.0, SampleScaling.ToMillivolts(4095), 2);
    }

    [Fact]
    public void ToMillivolts_es_lineal_con_span_10_sobre_4095()
    {
        // Span = (10-0)/(4095-0); Zero = 0 (FR-006).
        var span = 10.0 / 4095.0;
        Assert.Equal(1000 * span, SampleScaling.ToMillivolts(1000), 9);
    }
}
