using ECGViewer.Api.Dsp;
using ECGViewer.Api.Models;

namespace ECGViewer.Api.Endpoints;

public static class FilterEndpoints
{
    /// <summary>POST /api/filter — aplica un filtro DSP no destructivo (RF-10, AC-14).</summary>
    public static void MapFilterEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
            "/api/filter",
            (FilterRequest req) =>
            {
                var samples = req.Signal?.Samples;
                if (samples is null || samples.Count == 0)
                    return Results.BadRequest(
                        new ErrorResponse(new ApiError(ErrorCodes.InvalidSignal, "La señal está vacía."))
                    );

                var fs = SignalMath.ResolveFs(req.Signal!);
                var f = req.Filter;
                var validation = SignalFilter.Validate(fs, f.Type, f.CutoffLow, f.CutoffHigh);
                if (validation is not null)
                    return Results.BadRequest(
                        new ErrorResponse(new ApiError(ErrorCodes.InvalidFilterParams, validation.Message))
                    );

                var values = new double[samples.Count];
                for (var i = 0; i < samples.Count; i++)
                    values[i] = samples[i].V;

                var filtered = SignalFilter.Apply(values, fs, f.Type, f.CutoffLow, f.CutoffHigh);

                var outSamples = new SampleDto[samples.Count];
                for (var i = 0; i < samples.Count; i++)
                    outSamples[i] = new SampleDto(samples[i].T, filtered[i]);

                return Results.Ok(new FilterResponse(new SignalDto(outSamples, fs)));
            }
        );
    }
}
