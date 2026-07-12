using System.Text.Json;
using System.Text.Json.Serialization;
using ECGViewer.Api.Models;
using Microsoft.Data.Sqlite;

namespace ECGViewer.Api.Persistence;

/// <summary>
/// Persiste un ÚNICO estudio en SQLite (FR-021): guardar reemplaza el anterior
/// (upsert en la fila id=1); no hay lista ni comparación de estudios. La
/// persistencia ocurre solo por acción explícita del usuario (Principio III).
/// </summary>
public sealed class StudyRepository
{
    private readonly string _connectionString;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public StudyRepository(string dbPath)
    {
        _connectionString = new SqliteConnectionStringBuilder { DataSource = dbPath }.ToString();
        EnsureCreated();
    }

    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }

    private void EnsureCreated()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "CREATE TABLE IF NOT EXISTS Study (Id INTEGER PRIMARY KEY CHECK (Id = 1), Json TEXT NOT NULL, SavedAt TEXT NOT NULL);";
        cmd.ExecuteNonQuery();
    }

    /// <summary>Guarda (reemplaza) el estudio. Devuelve el instante de guardado.</summary>
    public DateTimeOffset Save(StudyDto study)
    {
        var savedAt = DateTimeOffset.UtcNow;
        var stored = study with { SavedAt = savedAt };
        var json = JsonSerializer.Serialize(stored, Json);

        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText =
            @"INSERT INTO Study (Id, Json, SavedAt) VALUES (1, $json, $savedAt)
              ON CONFLICT(Id) DO UPDATE SET Json = excluded.Json, SavedAt = excluded.SavedAt;";
        cmd.Parameters.AddWithValue("$json", json);
        cmd.Parameters.AddWithValue("$savedAt", savedAt.ToString("O"));
        cmd.ExecuteNonQuery();
        return savedAt;
    }

    /// <summary>Restaura el estudio guardado, o null si no hay ninguno.</summary>
    public StudyDto? Get()
    {
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT Json FROM Study WHERE Id = 1;";
        var result = cmd.ExecuteScalar() as string;
        return result is null ? null : JsonSerializer.Deserialize<StudyDto>(result, Json);
    }
}
