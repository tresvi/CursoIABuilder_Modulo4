using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ECGViewer.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ECGViewer.Tests;

public class FilterEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public FilterEndpointTests(WebApplicationFactory<Program> factory) =>
        _client = factory.CreateClient();

    private static SignalDto TwoTone(double f1, double f2, double fs = 500, int n = 1024)
    {
        var samples = new List<SampleDto>(n);
        for (var i = 0; i < n; i++)
        {
            var t = i / fs;
            samples.Add(new SampleDto(t, Math.Sin(2 * Math.PI * f1 * t) + Math.Sin(2 * Math.PI * f2 * t)));
        }
        return new SignalDto(samples, fs);
    }

    [Fact]
    public async Task Health_responde_ok()
    {
        var res = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Filter_lowpass_devuelve_la_senal_filtrada_mismo_eje_temporal()
    {
        var signal = TwoTone(5, 60);
        var req = new FilterRequest(signal, new FilterConfigDto(FilterType.LowPass, null, 20));

        var res = await _client.PostAsJsonAsync("/api/filter", req, Json);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<FilterResponse>(Json);
        Assert.NotNull(body);
        Assert.Equal(signal.Samples.Count, body!.Signal.Samples.Count);
        // mismo eje temporal
        Assert.Equal(signal.Samples[0].T, body.Signal.Samples[0].T, 6);
        Assert.Equal(signal.Samples[^1].T, body.Signal.Samples[^1].T, 6);
    }

    [Fact]
    public async Task Filter_con_longitud_no_potencia_de_2_devuelve_200()
    {
        // 1000 muestras no es potencia de 2; antes del fix la FFT radix-2 lanzaba 500.
        var signal = TwoTone(5, 60, n: 1000);
        var req = new FilterRequest(signal, new FilterConfigDto(FilterType.LowPass, null, 20));

        var res = await _client.PostAsJsonAsync("/api/filter", req, Json);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<FilterResponse>(Json);
        Assert.NotNull(body);
        Assert.Equal(1000, body!.Signal.Samples.Count);
        Assert.Equal(signal.Samples[0].T, body.Signal.Samples[0].T, 6);
        Assert.Equal(signal.Samples[^1].T, body.Signal.Samples[^1].T, 6);
    }

    [Fact]
    public async Task Filter_acepta_tipo_como_string_lowpass()
    {
        // Verifica el mapeo del enum al string del contrato ("lowpass").
        var signal = TwoTone(5, 60);
        var payload = new
        {
            signal,
            filter = new
            {
                type = "lowpass",
                cutoffLow = (double?)null,
                cutoffHigh = 20.0,
            },
        };
        var res = await _client.PostAsJsonAsync("/api/filter", payload);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Filter_bandpass_con_cortes_invertidos_devuelve_400()
    {
        var signal = TwoTone(5, 60);
        var req = new FilterRequest(signal, new FilterConfigDto(FilterType.BandPass, 40, 10));

        var res = await _client.PostAsJsonAsync("/api/filter", req, Json);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal(ErrorCodes.InvalidFilterParams, err!.Error.Code);
    }

    [Fact]
    public async Task Filter_senal_vacia_devuelve_400_invalid_signal()
    {
        var req = new FilterRequest(
            new SignalDto(new List<SampleDto>(), 500),
            new FilterConfigDto(FilterType.LowPass, null, 20)
        );
        var res = await _client.PostAsJsonAsync("/api/filter", req, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal(ErrorCodes.InvalidSignal, err!.Error.Code);
    }
}
