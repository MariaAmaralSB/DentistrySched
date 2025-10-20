using Microsoft.Extensions.Logging;

public class NotificationSender : INotificationSender
{
    private readonly IEmailSender _email;
    private readonly ISmsSender _sms;
    private readonly IWhatsAppSender _wa; // pode ser NullWhatsAppSender
    private readonly ILogger<NotificationSender> _logger;

    public NotificationSender(IEmailSender email, ISmsSender sms, IWhatsAppSender wa, ILogger<NotificationSender> logger)
    {
        _email = email; _sms = sms; _wa = wa; _logger = logger;
    }

    public async Task SendConfirmationAsync(string to, DateTime inicio, string? dentista, Guid id, CancellationToken ct = default)
    {
        var assunto = "Consulta confirmada (aguardando sua confirmação)";
        var corpo =
            $@"<p>Olá! Sua consulta com <b>{dentista}</b> está agendada para <b>{inicio:dd/MM/yyyy HH:mm}</b>.</p>
            <p>Para confirmar, clique: <a href=""{{FRONT_URL}}/confirmar/{id}"">Confirmar</a><br/>
            Para cancelar: <a href=""{{FRONT_URL}}/cancelar/{id}"">Cancelar</a></p>";

        await Safe(() => _email.SendAsync(to, assunto, corpo, ct));
        await Safe(() => _sms.SendAsync(to, $"Consulta {inicio:dd/MM HH:mm}. Confirme: {id}", ct));
        await Safe(() => _wa.SendAsync(to, $"Sua consulta {inicio:dd/MM HH:mm}. Responda CONFIRMAR {id} ou CANCELAR {id}.", ct));
    }

    public async Task SendCancellationAsync(string to, DateTime inicio, CancellationToken ct = default)
    {
        await Safe(() => _email.SendAsync(to, "Consulta cancelada",
            $"<p>Sua consulta de <b>{inicio:dd/MM/yyyy HH:mm}</b> foi cancelada.</p>", ct));
        await Safe(() => _sms.SendAsync(to, $"Consulta {inicio:dd/MM HH:mm} cancelada.", ct));
        await Safe(() => _wa.SendAsync(to, $"Consulta {inicio:dd/MM HH:mm} cancelada.", ct));
    }

    public async Task SendRescheduleAsync(string to, DateTime novoInicio, string? dentista, CancellationToken ct = default)
    {
        var html = $"<p>Sua consulta foi remarcada para <b>{novoInicio:dd/MM/yyyy HH:mm}</b> com <b>{dentista}</b>.</p>";
        await Safe(() => _email.SendAsync(to, "Consulta remarcada", html, ct));
        await Safe(() => _sms.SendAsync(to, $"Remarcada: {novoInicio:dd/MM HH:mm}.", ct));
        await Safe(() => _wa.SendAsync(to, $"Remarcada: {novoInicio:dd/MM HH:mm}.", ct));
    }

    private async Task Safe(Func<Task> op)
    {
        try { await op(); }
        catch (Exception ex) { _logger.LogWarning(ex, "Falha ao enviar notificação"); }
    }
}
