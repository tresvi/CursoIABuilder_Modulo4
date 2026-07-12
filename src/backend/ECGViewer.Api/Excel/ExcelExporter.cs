using ClosedXML.Excel;
using ECGViewer.Api.Models;

namespace ECGViewer.Api.Excel;

/// <summary>Exporta la señal a un archivo Excel (.xlsx) con ClosedXML (RF-12).</summary>
public static class ExcelExporter
{
    public const string ContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    public static byte[] ToXlsx(SignalDto signal)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("ECG");
        ws.Cell(1, 1).Value = "time";
        ws.Cell(1, 2).Value = "value";

        for (var i = 0; i < signal.Samples.Count; i++)
        {
            ws.Cell(i + 2, 1).Value = signal.Samples[i].T;
            ws.Cell(i + 2, 2).Value = signal.Samples[i].V;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
