using ECGViewer.Api.Dsp;
using ECGViewer.Api.Models;

namespace ECGViewer.Api.Endpoints;

public static class SpectrumEndpoints
{
    /// <summary>POST /api/spectrum — espectro de potencia de la señal recibida (feature 004).</summary>
    public static void MapSpectrumEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost(
            "/api/spectrum",
            (SpectrumRequest req) =>
            {
                var samples = req.Signal?.Samples;
                if (samples is null || samples.Count == 0)
                    return Results.BadRequest(
                        new ErrorResponse(new ApiError(ErrorCodes.InvalidSignal, "La señal está vacía."))
                    );

                if (!PowerSpectrum.HasEnoughSamples(samples.Count))
                    return Results.BadRequest(
                        new ErrorResponse(
                            new ApiError(
                                ErrorCodes.InsufficientSamples,
                                $"Se necesitan al menos {PowerSpectrum.MinSamples} muestras para un espectro con sentido."
                            )
                        )
                    );

                var fs = SignalMath.ResolveFs(req.Signal!);
                var values = new double[samples.Count];
                for (var i = 0; i < samples.Count; i++)
                    values[i] = samples[i].V;

                var points = PowerSpectrum.Compute(values, fs);
                return Results.Ok(new SpectrumResponse(new SpectrumDto(points)));
            }
        );
    }
}
