using ClosedXML.Excel;
using ECGViewer.Api.Models;

namespace ECGViewer.Api.Excel;

/// <summary>
/// Importa una señal desde un archivo Excel (.xlsx) con ClosedXML (RF-13).
/// Aplica las mismas validaciones que el CSV: un solo canal, columnas tiempo/valor
/// numéricas, encabezado presente (AC-17).
/// </summary>
public static class ExcelImporter
{
    public sealed record Result(SignalDto? Signal, string? ErrorCode, string? Message)
    {
        public static Result Ok(SignalDto s) => new(s, null, null);
        public static Result Fail(string code, string message) => new(null, code, message);
    }

    public static Result FromStream(Stream stream)
    {
        XLWorkbook wb;
        try
        {
            wb = new XLWorkbook(stream);
        }
        catch
        {
            return Result.Fail(ErrorCodes.InvalidXlsx, "El archivo no es un .xlsx válido.");
        }

        using (wb)
        {
            var ws = wb.Worksheets.FirstOrDefault();
            var lastRow = ws?.LastRowUsed()?.RowNumber() ?? 0;
            var lastCol = ws?.LastColumnUsed()?.ColumnNumber() ?? 0;

            if (ws is null || lastRow < 2)
                return Result.Fail(
                    ErrorCodes.InvalidXlsx,
                    "El archivo está vacío o solo tiene el encabezado."
                );

            if (lastCol > 2)
                return Result.Fail(
                    ErrorCodes.MultichannelNotSupported,
                    "El archivo tiene más de un canal; solo se soporta un canal."
                );
            if (lastCol < 2)
                return Result.Fail(
                    ErrorCodes.InvalidXlsx,
                    "Se esperan columnas de tiempo y valor."
                );

            var samples = new List<SampleDto>(lastRow - 1);
            for (var r = 2; r <= lastRow; r++)
            {
                var c1 = ws.Cell(r, 1);
                var c2 = ws.Cell(r, 2);
                if (!c1.TryGetValue<double>(out var t) || !c2.TryGetValue<double>(out var v))
                    return Result.Fail(
                        ErrorCodes.InvalidXlsx,
                        $"La fila {r} contiene valores no numéricos."
                    );
                samples.Add(new SampleDto(t, v));
            }

            if (samples.Count == 0)
                return Result.Fail(ErrorCodes.InvalidXlsx, "El archivo no contiene datos.");

            return Result.Ok(new SignalDto(samples));
        }
    }
}
