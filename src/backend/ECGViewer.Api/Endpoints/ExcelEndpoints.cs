using ECGViewer.Api.Excel;
using ECGViewer.Api.Models;

namespace ECGViewer.Api.Endpoints;

public static class ExcelEndpoints
{
    /// <summary>POST /api/export/xlsx y /api/import/xlsx (RF-12/13).</summary>
    public static void MapExcelEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
            "/api/export/xlsx",
            (SignalDto signal) =>
            {
                if (signal?.Samples is null || signal.Samples.Count == 0)
                    return Results.BadRequest(
                        new ErrorResponse(new ApiError(ErrorCodes.InvalidSignal, "La señal está vacía."))
                    );

                var bytes = ExcelExporter.ToXlsx(signal);
                return Results.File(bytes, ExcelExporter.ContentType, "ecg.xlsx");
            }
        );

        app.MapPost(
                "/api/import/xlsx",
                async (IFormFile file) =>
                {
                    if (file is null || file.Length == 0)
                        return Results.BadRequest(
                            new ErrorResponse(new ApiError(ErrorCodes.InvalidXlsx, "No se recibió archivo."))
                        );

                    await using var stream = file.OpenReadStream();
                    var result = ExcelImporter.FromStream(stream);

                    if (result.Signal is not null)
                        return Results.Ok(new { signal = result.Signal });

                    var error = new ErrorResponse(new ApiError(result.ErrorCode!, result.Message!));
                    return result.ErrorCode == ErrorCodes.MultichannelNotSupported
                        ? Results.UnprocessableEntity(error)
                        : Results.BadRequest(error);
                }
            )
            .DisableAntiforgery();
    }
}
