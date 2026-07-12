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
    public static ValidationError? Validate(
        double fs,
        FilterType type,
        double? low,
        double? high,
        int? window = null,
        int? polyOrder = null
    )
    {
        if (fs <= 0)
            return new ValidationError("Frecuencia de muestreo inválida (fs <= 0).");

        // Filtros de tiempo: se validan por tamaño de ventana (muestras), no por Nyquist.
        if (type is FilterType.MovingAverage or FilterType.Median or FilterType.SavitzkyGolay)
            return ValidateTimeDomain(type, window, polyOrder);

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

    /// <summary>
    /// Valida los filtros de dominio de tiempo. La media móvil admite cualquier ventana
    /// ≥ 2; la mediana y Savitzky–Golay exigen ventana impar ≥ 3 (para centrarla), y
    /// Savitzky–Golay además exige un grado de polinomio en [1, ventana − 1].
    /// </summary>
    private static ValidationError? ValidateTimeDomain(FilterType type, int? window, int? polyOrder)
    {
        var w = window ?? 0;
        if (type is FilterType.MovingAverage)
        {
            if (w < 2)
                return new ValidationError("La ventana debe ser ≥ 2 muestras.");
            return null;
        }

        // Median / Savitzky–Golay
        if (w < 3 || w % 2 == 0)
            return new ValidationError("La ventana debe ser un número impar ≥ 3 muestras.");

        if (type is FilterType.SavitzkyGolay)
        {
            var p = polyOrder ?? 0;
            if (p < 1 || p >= w)
                return new ValidationError("El grado del polinomio debe estar en [1, ventana − 1].");
        }

        return null;
    }

    /// <summary>
    /// Aplica el filtro a las amplitudes. Asume parámetros ya validados.
    /// FftSharp usa una FFT radix-2 que exige longitud potencia de 2. Se extiende la
    /// señal hasta la siguiente potencia de 2 rellenando por REFLEJO (espejo) en vez de
    /// ceros, se filtra y se recorta de vuelta a la longitud original. El reflejo
    /// mantiene la señal continua en la costura y evita tanto el escalón señal→0 del
    /// zero-pad como la pérdida de amplitud que ese escalón produce con el filtrado FFT
    /// (convolución circular). Como la siguiente potencia de 2 nunca supera 2·n, un solo
    /// reflejo alcanza para rellenar el sobrante.
    /// </summary>
    public static double[] Apply(
        double[] values,
        double fs,
        FilterType type,
        double? low,
        double? high,
        int? window = null,
        int? polyOrder = null
    )
    {
        var n = values.Length;
        if (n == 0)
            return [];
        if (n == 1)
            return (double[])values.Clone();

        switch (type)
        {
            case FilterType.MovingAverage:
                return MovingAverage(values, window!.Value);
            case FilterType.Median:
                return MedianFilter(values, window!.Value);
            case FilterType.SavitzkyGolay:
                return SavitzkyGolay(values, window!.Value, polyOrder!.Value);
        }

        var padded = ReflectPad(values, NextPowerOfTwo(n));
        var filtered = CoreFilter(padded, fs, type, low, high);

        var result = new double[n];
        Array.Copy(filtered, result, n);
        return result;
    }

    /// <summary>Menor potencia de 2 mayor o igual a <paramref name="n"/>.</summary>
    private static int NextPowerOfTwo(int n)
    {
        var p = 1;
        while (p < n)
            p <<= 1;
        return p;
    }

    /// <summary>
    /// Extiende <paramref name="v"/> (largo n) hasta <paramref name="length"/> reflejando
    /// la cola como un espejo (…,v[n-2] | v[0..n-1] | v[n-2],v[n-3],…), sin repetir el
    /// extremo. Requiere length &lt; 2·n, garantizado por NextPowerOfTwo(n).
    /// </summary>
    private static double[] ReflectPad(double[] v, int length)
    {
        var n = v.Length;
        var padded = new double[length];
        Array.Copy(v, padded, n);
        for (var k = 0; n + k < length; k++)
            padded[n + k] = v[n - 2 - k];
        return padded;
    }

    /// <summary>Despacha al filtro de FftSharp. Requiere longitud potencia de 2.</summary>
    private static double[] CoreFilter(double[] values, double fs, FilterType type, double? low, double? high)
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

    // ----------------------------------------------------------------------------------
    // Filtros en el dominio del tiempo (alternativas a la media móvil que conservan mejor
    // los picos). Todos son de ventana deslizante centrada; los bordes se resuelven
    // reflejando la señal (reflect-101) para no introducir escalones ni perder muestras.
    // ----------------------------------------------------------------------------------

    /// <summary>
    /// Media móvil: promedio simple de una ventana centrada. Suaviza el ruido pero
    /// tiende a achatar los picos angostos (el pico R). Ventana en muestras (≥ 2).
    /// </summary>
    private static double[] MovingAverage(double[] v, int window)
    {
        var n = v.Length;
        var half = (window - 1) / 2;
        var result = new double[n];
        for (var i = 0; i < n; i++)
        {
            double sum = 0;
            for (var k = -half; k < window - half; k++)
                sum += v[MirrorIndex(i + k, n)];
            result[i] = sum / window;
        }
        return result;
    }

    /// <summary>
    /// Mediana móvil: toma la mediana de una ventana centrada (impar). Elimina ruido
    /// impulsivo y preserva bordes/escalones sin arrastrar el promedio. Ventana en muestras.
    /// </summary>
    private static double[] MedianFilter(double[] v, int window)
    {
        var n = v.Length;
        var half = window / 2;
        var result = new double[n];
        var buf = new double[window];
        for (var i = 0; i < n; i++)
        {
            for (var k = 0; k < window; k++)
                buf[k] = v[MirrorIndex(i - half + k, n)];
            Array.Sort(buf);
            result[i] = buf[half];
        }
        return result;
    }

    /// <summary>
    /// Savitzky–Golay: ajusta un polinomio de grado <paramref name="polyOrder"/> por
    /// mínimos cuadrados en cada ventana centrada (impar) y evalúa el centro. Suaviza el
    /// ruido conservando la altura y el ancho de los picos. Es un FIR de coeficientes fijos.
    /// </summary>
    private static double[] SavitzkyGolay(double[] v, int window, int polyOrder)
    {
        var half = window / 2;
        var coeffs = SavGolCoefficients(half, polyOrder);
        var n = v.Length;
        var result = new double[n];
        for (var i = 0; i < n; i++)
        {
            double sum = 0;
            for (var j = -half; j <= half; j++)
                sum += coeffs[j + half] * v[MirrorIndex(i + j, n)];
            result[i] = sum;
        }
        return result;
    }

    /// <summary>
    /// Coeficientes de convolución del suavizado Savitzky–Golay (derivada 0) para una
    /// ventana [-half, half] y polinomio de grado <paramref name="polyOrder"/>. El valor
    /// suavizado del centro es el término constante del ajuste, i.e. la fila 0 de
    /// (AᵀA)⁻¹Aᵀ. Como AᵀA es simétrica, esa fila es la solución de AᵀA·s = e₀, y el peso
    /// de cada muestra j resulta wⱼ = Σ_c s[c]·zⱼ^c.
    /// </summary>
    private static double[] SavGolCoefficients(int half, int polyOrder)
    {
        var cols = polyOrder + 1;

        // Matriz normal AᵀA: ata[a,b] = Σ_z z^(a+b), con z en [-half, half].
        var ata = new double[cols, cols];
        for (var a = 0; a < cols; a++)
        for (var b = 0; b < cols; b++)
        {
            double s = 0;
            for (var z = -half; z <= half; z++)
                s += Math.Pow(z, a + b);
            ata[a, b] = s;
        }

        // Resolver AᵀA·s = e₀.
        var e0 = new double[cols];
        e0[0] = 1.0;
        var sol = SolveLinearSystem(ata, e0);

        // wⱼ = Σ_c sol[c]·zⱼ^c para cada muestra de la ventana.
        var weights = new double[2 * half + 1];
        for (var j = -half; j <= half; j++)
        {
            double w = 0;
            for (var c = 0; c < cols; c++)
                w += sol[c] * Math.Pow(j, c);
            weights[j + half] = w;
        }
        return weights;
    }

    /// <summary>Resuelve A·x = b por eliminación gaussiana con pivoteo parcial (A pequeña).</summary>
    private static double[] SolveLinearSystem(double[,] a, double[] b)
    {
        var m = b.Length;
        var mat = (double[,])a.Clone();
        var rhs = (double[])b.Clone();

        for (var col = 0; col < m; col++)
        {
            var pivot = col;
            for (var r = col + 1; r < m; r++)
                if (Math.Abs(mat[r, col]) > Math.Abs(mat[pivot, col]))
                    pivot = r;

            if (pivot != col)
            {
                for (var k = 0; k < m; k++)
                    (mat[col, k], mat[pivot, k]) = (mat[pivot, k], mat[col, k]);
                (rhs[col], rhs[pivot]) = (rhs[pivot], rhs[col]);
            }

            var diag = mat[col, col];
            for (var r = 0; r < m; r++)
            {
                if (r == col)
                    continue;
                var factor = mat[r, col] / diag;
                for (var k = 0; k < m; k++)
                    mat[r, k] -= factor * mat[col, k];
                rhs[r] -= factor * rhs[col];
            }
        }

        var x = new double[m];
        for (var i = 0; i < m; i++)
            x[i] = rhs[i] / mat[i, i];
        return x;
    }

    /// <summary>
    /// Índice reflejado (reflect-101, sin repetir el borde) para acceder a <c>v</c> fuera de
    /// rango en los extremos de la ventana. Con período 2·(n−1) cubre reflexiones repetidas.
    /// </summary>
    private static int MirrorIndex(int i, int n)
    {
        if (n == 1)
            return 0;
        var period = 2 * (n - 1);
        var m = ((i % period) + period) % period;
        return m < n ? m : period - m;
    }
}
