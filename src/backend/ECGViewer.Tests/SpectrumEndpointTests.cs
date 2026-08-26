using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ECGViewer.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ECGViewer.Tests;

public class SpectrumEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public SpectrumEndpointTests(WebApplicationFactory<Program> factory) =>
        _client = factory.CreateClient();

    private static SignalDto Sinusoid(double freq, double fs = 500, int n = 1024)
    {
        var samples = new List<SampleDto>(n);
        for (var i = 0; i < n; i++)
        {
            var t = i / fs;
            samples.Add(new SampleDto(t, Math.Sin(2 * Math.PI * freq * t)));
        }
        return new SignalDto(samples, fs);
    }

    [Fact]
    public async Task Spectrum_devuelve_puntos_ordenados_por_frecuencia_hasta_nyquist()
    {
        var ct = TestContext.Current.CancellationToken;
        var signal = Sinusoid(50);

        var res = await _client.PostAsJsonAsync(
            "/api/spectrum",
            new SpectrumRequest(signal),
            Json,
            ct
        );

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SpectrumResponse>(Json, ct);
        Assert.NotNull(body);
        var points = body!.Spectrum.Points;
        Assert.NotEmpty(points);
        for (var i = 1; i < points.Count; i++)
            Assert.True(points[i].Frequency > points[i - 1].Frequency);
        Assert.True(points[^1].Frequency <= signal.Fs!.Value / 2 + 1e-6);
    }

    [Fact]
    public async Task Spectrum_senal_vacia_devuelve_400_invalid_signal()
    {
        var ct = TestContext.Current.CancellationToken;
        var req = new SpectrumRequest(new SignalDto(new List<SampleDto>(), 500));

        var res = await _client.PostAsJsonAsync("/api/spectrum", req, Json, ct);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json, ct);
        Assert.Equal(ErrorCodes.InvalidSignal, err!.Error.Code);
    }

    [Fact]
    public async Task Spectrum_ventana_con_pocas_muestras_devuelve_400_insufficient_samples()
    {
        var ct = TestContext.Current.CancellationToken;
        var signal = Sinusoid(50, n: 4); // por debajo de PowerSpectrum.MinSamples (8)

        var res = await _client.PostAsJsonAsync(
            "/api/spectrum",
            new SpectrumRequest(signal),
            Json,
            ct
        );

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json, ct);
        Assert.Equal(ErrorCodes.InsufficientSamples, err!.Error.Code);
    }
}
