using ECGViewer.Api.Serial;

namespace ECGViewer.Tests;

/// <summary>
/// Tests de `SerialCaptureService` con una fuente simulada (`FakeSerialLineSource`)
/// — el puerto serie nunca se abre de verdad (Principio I).
/// </summary>
public class SerialCaptureServiceTests
{
    [Fact]
    public void La_linea_2048_produce_una_muestra_de_aprox_5mV_en_t0()
    {
        var fake = new FakeSerialLineSource();
        var service = new SerialCaptureService(fake);

        service.Connect("COM3", 115200);
        fake.EmitLine("2048");

        var sample = Assert.Single(service.Samples);
        Assert.Equal(0.0, sample.T, 9);
        Assert.Equal(5.0, sample.V, 2);
    }

    [Fact]
    public void La_siguiente_muestra_valida_se_numera_en_t_1_sobre_250()
    {
        var fake = new FakeSerialLineSource();
        var service = new SerialCaptureService(fake);

        service.Connect("COM3", 115200);
        fake.EmitLine("2048");
        fake.EmitLine("0");

        Assert.Equal(2, service.Samples.Count);
        Assert.Equal(1.0 / 250.0, service.Samples[1].T, 9);
        Assert.Equal(0.0, service.Samples[1].V, 9);
    }

    [Fact]
    public void Una_linea_no_numerica_se_descarta_sin_cortar_la_conexion()
    {
        var fake = new FakeSerialLineSource();
        var service = new SerialCaptureService(fake);

        service.Connect("COM3", 115200);
        fake.EmitLine("no-es-un-numero");
        fake.EmitLine("2048");

        Assert.Equal(CaptureStatus.Connected, service.Status);
        Assert.Single(service.Samples);
    }

    [Fact]
    public void Al_acumular_300000_muestras_validas_se_detiene_sola()
    {
        var fake = new FakeSerialLineSource();
        var service = new SerialCaptureService(fake);

        service.Connect("COM3", 115200);
        for (var i = 0; i < 300_000; i++)
            fake.EmitLine("2048");

        Assert.Equal(CaptureStatus.Stopped, service.Status);
        Assert.Equal("TIME_LIMIT", service.Reason);
        Assert.Equal(300_000, service.Samples.Count);
        Assert.False(fake.IsOpen);
    }

    [Fact]
    public void Si_la_fuente_reporta_desconexion_el_estado_pasa_a_error()
    {
        var fake = new FakeSerialLineSource();
        var service = new SerialCaptureService(fake);

        service.Connect("COM3", 115200);
        fake.EmitDisconnected();

        Assert.Equal(CaptureStatus.Error, service.Status);
        Assert.Equal("DEVICE_DISCONNECTED", service.Reason);
    }
}
