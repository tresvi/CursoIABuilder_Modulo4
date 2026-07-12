using ClosedXML.Excel;
using ECGViewer.Api.Excel;
using ECGViewer.Api.Models;

namespace ECGViewer.Tests;

public class ExcelTests
{
    private static SignalDto Sample() =>
        new(
            new List<SampleDto>
            {
                new(0.0, 0.12),
                new(0.004, 0.15),
                new(0.008, -0.10),
            },
            250
        );

    [Fact]
    public void Export_luego_Import_conserva_tiempo_y_valor_roundtrip()
    {
        var signal = Sample();
        var bytes = ExcelExporter.ToXlsx(signal);

        using var ms = new MemoryStream(bytes);
        var result = ExcelImporter.FromStream(ms);

        Assert.NotNull(result.Signal);
        Assert.Equal(3, result.Signal!.Samples.Count);
        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(signal.Samples[i].T, result.Signal.Samples[i].T, 9);
            Assert.Equal(signal.Samples[i].V, result.Signal.Samples[i].V, 9);
        }
    }

    private static Stream BuildXlsx(Action<IXLWorksheet> fill)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("ECG");
        fill(ws);
        var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public void Import_estructura_invalida_una_columna_devuelve_invalid_xlsx()
    {
        using var s = BuildXlsx(ws =>
        {
            ws.Cell(1, 1).Value = "value";
            ws.Cell(2, 1).Value = 0.12;
        });
        var result = ExcelImporter.FromStream(s);
        Assert.Equal(ErrorCodes.InvalidXlsx, result.ErrorCode);
    }

    [Fact]
    public void Import_multicanal_tres_columnas_devuelve_multichannel()
    {
        using var s = BuildXlsx(ws =>
        {
            ws.Cell(1, 1).Value = "time";
            ws.Cell(1, 2).Value = "ch1";
            ws.Cell(1, 3).Value = "ch2";
            ws.Cell(2, 1).Value = 0.0;
            ws.Cell(2, 2).Value = 0.1;
            ws.Cell(2, 3).Value = 0.2;
        });
        var result = ExcelImporter.FromStream(s);
        Assert.Equal(ErrorCodes.MultichannelNotSupported, result.ErrorCode);
    }

    [Fact]
    public void Import_solo_encabezado_devuelve_invalid_xlsx()
    {
        using var s = BuildXlsx(ws =>
        {
            ws.Cell(1, 1).Value = "time";
            ws.Cell(1, 2).Value = "value";
        });
        var result = ExcelImporter.FromStream(s);
        Assert.Equal(ErrorCodes.InvalidXlsx, result.ErrorCode);
    }

    [Fact]
    public void Import_valor_no_numerico_devuelve_invalid_xlsx()
    {
        using var s = BuildXlsx(ws =>
        {
            ws.Cell(1, 1).Value = "time";
            ws.Cell(1, 2).Value = "value";
            ws.Cell(2, 1).Value = 0.0;
            ws.Cell(2, 2).Value = "abc";
        });
        var result = ExcelImporter.FromStream(s);
        Assert.Equal(ErrorCodes.InvalidXlsx, result.ErrorCode);
    }
}
