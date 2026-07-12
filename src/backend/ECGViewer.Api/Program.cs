using System.Text.Json.Serialization;
using ECGViewer.Api.Endpoints;
using ECGViewer.Api.Persistence;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "ecgviewer-front";

// CORS: habilita el front de desarrollo (5173) y el de preview (4173).
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        CorsPolicy,
        policy =>
            policy
                .WithOrigins(
                    "http://localhost:5173",
                    "http://localhost:4173",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:4173"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
    );
});

// Enums como string ("lowpass", ...) en el JSON.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Persistencia del estudio único en SQLite (ruta configurable para tests).
var dbPath = builder.Configuration["StudyDbPath"] ?? "ecgviewer.db";
builder.Services.AddSingleton(new StudyRepository(dbPath));

var app = builder.Build();

app.UseCors(CorsPolicy);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapFilterEndpoints();
app.MapStudyEndpoints();
app.MapExcelEndpoints();

app.Run();

// Expuesto para las pruebas de integración (WebApplicationFactory).
public partial class Program { }
