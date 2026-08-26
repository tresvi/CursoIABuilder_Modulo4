namespace ECGViewer.Api.Serial;

/// <summary>
/// Escalado de una cuenta entera recibida por el puerto serie a milivoltios
/// (feature 005, FR-006). Span/Zero son los valores fijos del cálculo provisto:
/// Span = (10 − 0) / (4095 − 0) ≈ 0.00244 mV/cuenta; Zero = 0.
/// </summary>
public static class SampleScaling
{
    private const double Span = (10.0 - 0.0) / (4095.0 - 0.0);
    private const double Zero = 0.0;

    public static double ToMillivolts(int count) => count * Span + Zero;
}
