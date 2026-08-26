using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ECGViewer.Api.Models;
using ECGViewer.Api.Serial;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ECGViewer.Tests;

/// <summary>
/// Cada test arma su propia `WebApplicationFactory` (como `StudyEndpointTests`,
/// no `IClassFixture`) para que la `FakeSerialLineSource` no comparta estado
/// entre tests — importante porque `ISerialLineSource`/`SerialCaptureService`
/// son singletons con estado de conexión.
/// </summary>
public class SerialEndpointTests : IDisposable
{
    private readonly FakeSerialLineSource _fakeSource = new();
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public SerialEndpointTests()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.ConfigureServices(services =>
            {
                services.RemoveAll<ISerialLineSource>();
                services.AddSingleton<ISerialLineSource>(_fakeSource);
            })
        );
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task Ports_devuelve_los_puertos_que_reporta_la_fuente()
    {
        _fakeSource.PortNames = ["COM3", "COM4"];

        var res = await _client.GetAsync("/api/serial/ports", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SerialPortsResponse>(
            Json,
            TestContext.Current.CancellationToken
        );
        Assert.Equal(["COM3", "COM4"], body!.Ports);
    }

    [Fact]
    public async Task Ports_devuelve_vacio_si_no_hay_ninguno()
    {
        _fakeSource.PortNames = [];

        var res = await _client.GetAsync("/api/serial/ports", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<SerialPortsResponse>(
            Json,
            TestContext.Current.CancellationToken
        );
        Assert.Empty(body!.Ports);
    }

    [Fact]
    public async Task Connect_con_un_puerto_valido_devuelve_200()
    {
        _fakeSource.PortNames = ["COM3"];
        var res = await _client.PostAsJsonAsync(
            "/api/serial/connect",
            new SerialConnectRequest("COM3", 115200),
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.True(_fakeSource.IsOpen);
    }

    [Fact]
    public async Task Connect_dos_veces_mientras_hay_una_conexion_activa_devuelve_409()
    {
        _fakeSource.PortNames = ["COM3"];
        await _client.PostAsJsonAsync(
            "/api/serial/connect",
            new SerialConnectRequest("COM3", 115200),
            TestContext.Current.CancellationToken
        );
        var res = await _client.PostAsJsonAsync(
            "/api/serial/connect",
            new SerialConnectRequest("COM3", 115200),
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Connect_con_un_puerto_que_no_esta_en_la_lista_devuelve_400()
    {
        _fakeSource.PortNames = ["COM3"];
        var res = await _client.PostAsJsonAsync(
            "/api/serial/connect",
            new SerialConnectRequest("COM9", 115200),
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Disconnect_es_idempotente()
    {
        var res1 = await _client.PostAsync(
            "/api/serial/disconnect",
            null,
            TestContext.Current.CancellationToken
        );
        var res2 = await _client.PostAsync(
            "/api/serial/disconnect",
            null,
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, res1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }
}
