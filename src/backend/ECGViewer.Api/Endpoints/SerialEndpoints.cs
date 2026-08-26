using ECGViewer.Api.Models;
using ECGViewer.Api.Serial;

namespace ECGViewer.Api.Endpoints;

public static class SerialEndpoints
{
    /// <summary>Endpoints de conexión al hardware del ECG por puerto serie (feature 005).</summary>
    public static void MapSerialEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(
            "/api/serial/ports",
            (ISerialLineSource source) =>
                Results.Ok(new SerialPortsResponse(source.GetPortNames()))
        );

        app.MapPost(
            "/api/serial/connect",
            (SerialConnectRequest req, ISerialLineSource source, SerialCaptureService capture) =>
            {
                if (!source.GetPortNames().Contains(req.Port))
                    return Results.BadRequest(
                        new ErrorResponse(
                            new ApiError(ErrorCodes.PortNotFound, $"Puerto no encontrado: {req.Port}")
                        )
                    );

                try
                {
                    capture.Connect(req.Port, req.BaudRate);
                }
                catch (AlreadyConnectedException)
                {
                    return Results.Conflict(
                        new ErrorResponse(
                            new ApiError(ErrorCodes.AlreadyConnected, "Ya hay una conexión activa.")
                        )
                    );
                }
                catch (Exception ex)
                {
                    return Results.BadRequest(
                        new ErrorResponse(new ApiError(ErrorCodes.PortUnavailable, ex.Message))
                    );
                }

                return Results.Ok();
            }
        );

        app.MapPost(
            "/api/serial/disconnect",
            (SerialCaptureService capture) =>
            {
                capture.Disconnect();
                return Results.Ok();
            }
        );

        app.MapGet(
            "/api/serial/stream",
            async (HttpContext ctx, SerialCaptureService capture, CancellationToken ct) =>
            {
                ctx.Response.Headers.CacheControl = "no-cache";
                ctx.Response.ContentType = "text/event-stream";

                var sentCount = 0;
                while (!ct.IsCancellationRequested)
                {
                    var samples = capture.Samples;
                    var status = capture.Status;
                    var pending = samples.Skip(sentCount).ToList();
                    sentCount = samples.Count;

                    if (pending.Count > 0 || status != CaptureStatus.Connected)
                    {
                        var evt = new SerialStreamEventDto(
                            pending,
                            status.ToString().ToLowerInvariant(),
                            capture.Reason
                        );
                        await ctx.Response.WriteAsync(
                            $"data: {System.Text.Json.JsonSerializer.Serialize(evt)}\n\n",
                            ct
                        );
                        await ctx.Response.Body.FlushAsync(ct);

                        if (status != CaptureStatus.Connected)
                            break;
                    }

                    await Task.Delay(100, ct);
                }
            }
        );
    }
}
