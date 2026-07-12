using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using ECGViewer.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;

namespace ECGViewer.Tests;

public class StudyEndpointTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(),
        $"ecgviewer-ep-{Guid.NewGuid():N}.db"
    );
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public StudyEndpointTests()
    {
        var dbPath = _dbPath;
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.UseSetting("StudyDbPath", dbPath)
        );
        _client = _factory.CreateClient();
    }

    private static StudyDto SampleStudy() =>
        new(
            new SignalDto(new List<SampleDto> { new(0, 0.5), new(0.004, 0.6) }, 250),
            new List<MarkerDto> { new("m1", 1.0, "arritmia") },
            new FilterConfigDto(FilterType.BandPass, 0.5, 40),
            new CropDto(0, 0.004)
        );

    [Fact]
    public async Task Get_sin_estudio_devuelve_404_not_found()
    {
        var res = await _client.GetAsync("/api/study");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        var err = await res.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal(ErrorCodes.NotFound, err!.Error.Code);
    }

    [Fact]
    public async Task Put_guarda_y_Get_restaura_el_estudio()
    {
        var put = await _client.PutAsJsonAsync("/api/study", SampleStudy(), Json);
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
        var saved = await put.Content.ReadFromJsonAsync<SaveStudyResponse>(Json);
        Assert.True(saved!.SavedAt <= DateTimeOffset.UtcNow);

        var get = await _client.GetAsync("/api/study");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var study = await get.Content.ReadFromJsonAsync<StudyDto>(Json);
        Assert.Equal("arritmia", study!.Markers[0].Label);
        Assert.Equal(FilterType.BandPass, study.Filter!.Type);
    }

    [Fact]
    public async Task Put_con_senal_vacia_devuelve_400()
    {
        var empty = new StudyDto(
            new SignalDto(new List<SampleDto>(), 250),
            new List<MarkerDto>(),
            null,
            null
        );
        var res = await _client.PutAsJsonAsync("/api/study", empty, Json);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        if (File.Exists(_dbPath))
            File.Delete(_dbPath);
    }
}
