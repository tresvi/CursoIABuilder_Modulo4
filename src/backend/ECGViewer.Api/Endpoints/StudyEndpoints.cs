using ECGViewer.Api.Models;
using ECGViewer.Api.Persistence;

namespace ECGViewer.Api.Endpoints;

public static class StudyEndpoints
{
    /// <summary>GET/PUT /api/study — restaura/guarda el estudio único (RF-15/21).</summary>
    public static void MapStudyEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
            "/api/study",
            (StudyRepository repo) =>
            {
                var study = repo.Get();
                return study is null
                    ? Results.NotFound(
                        new ErrorResponse(
                            new ApiError(ErrorCodes.NotFound, "No hay ningún estudio guardado.")
                        )
                    )
                    : Results.Ok(study);
            }
        );

        app.MapPut(
            "/api/study",
            (StudyDto study, StudyRepository repo) =>
            {
                if (study.Signal?.Samples is null || study.Signal.Samples.Count == 0)
                    return Results.BadRequest(
                        new ErrorResponse(
                            new ApiError(ErrorCodes.InvalidSignal, "La señal está vacía.")
                        )
                    );

                var savedAt = repo.Save(study);
                return Results.Ok(new SaveStudyResponse(savedAt));
            }
        );
    }
}
