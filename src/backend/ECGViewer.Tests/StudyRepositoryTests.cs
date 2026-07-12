using ECGViewer.Api.Models;
using ECGViewer.Api.Persistence;

namespace ECGViewer.Tests;

public class StudyRepositoryTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(),
        $"ecgviewer-test-{Guid.NewGuid():N}.db"
    );

    private StudyDto SampleStudy(double firstV) =>
        new(
            new SignalDto(new List<SampleDto> { new(0, firstV), new(0.004, firstV + 1) }, 250),
            new List<MarkerDto> { new("m1", 1.0, "artefacto") },
            new FilterConfigDto(FilterType.LowPass, null, 40),
            new CropDto(0, 0.004)
        );

    [Fact]
    public void Get_devuelve_null_cuando_no_hay_estudio()
    {
        var repo = new StudyRepository(_dbPath);
        Assert.Null(repo.Get());
    }

    [Fact]
    public void Save_luego_Get_restaura_el_estudio()
    {
        var repo = new StudyRepository(_dbPath);
        repo.Save(SampleStudy(0.5));

        var restored = repo.Get();
        Assert.NotNull(restored);
        Assert.Equal(0.5, restored!.Signal.Samples[0].V);
        Assert.Single(restored.Markers);
        Assert.Equal("artefacto", restored.Markers[0].Label);
        Assert.Equal(FilterType.LowPass, restored.Filter!.Type);
        Assert.Equal(0.004, restored.Crop!.ToTime, 6);
        Assert.NotNull(restored.SavedAt);
    }

    [Fact]
    public void Save_reemplaza_el_estudio_anterior_estudio_unico()
    {
        var repo = new StudyRepository(_dbPath);
        repo.Save(SampleStudy(0.5));
        repo.Save(SampleStudy(9.9));

        var restored = repo.Get();
        Assert.Equal(9.9, restored!.Signal.Samples[0].V);
    }

    public void Dispose()
    {
        if (File.Exists(_dbPath))
            File.Delete(_dbPath);
    }
}
