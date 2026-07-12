using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ECGViewer.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ECGViewer.Tests;

public class ExcelEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public ExcelEndpointTests(WebApplicationFactory<Program> factory) =>
        _client = factory.CreateClient();

    private static SignalDto Sample() =>
        new(new List<SampleDto> { new(0, 0.12), new(0.004, 0.15), new(0.008, -0.1) }, 250);

    [Fact]
    public async Task Export_devuelve_xlsx_y_reimportar_conserva_los_datos()
    {
        var signal = Sample();

        var export = await _client.PostAsJsonAsync("/api/export/xlsx", signal, Json);
        Assert.Equal(HttpStatusCode.OK, export.StatusCode);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            export.Content.Headers.ContentType!.MediaType
        );
        var bytes = await export.Content.ReadAsByteArrayAsync();
        Assert.NotEmpty(bytes);

        // reimportar (multipart)
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        form.Add(fileContent, "file", "ecg.xlsx");

        var import = await _client.PostAsync("/api/import/xlsx", form);
        Assert.Equal(HttpStatusCode.OK, import.StatusCode);
        var body = await import.Content.ReadFromJsonAsync<ImportResponse>(Json);
        Assert.Equal(3, body!.Signal.Samples.Count);
        Assert.Equal(0.15, body.Signal.Samples[1].V, 9);
    }

    [Fact]
    public async Task Import_archivo_no_xlsx_devuelve_400()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent("no soy un xlsx"u8.ToArray()), "file", "bad.xlsx");

        var res = await _client.PostAsync("/api/import/xlsx", form);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal(ErrorCodes.InvalidXlsx, err!.Error.Code);
    }

    [Fact]
    public async Task Export_senal_vacia_devuelve_400()
    {
        var res = await _client.PostAsJsonAsync(
            "/api/export/xlsx",
            new SignalDto(new List<SampleDto>(), 250),
            Json
        );
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    private record ImportResponse(SignalDto Signal);
}
