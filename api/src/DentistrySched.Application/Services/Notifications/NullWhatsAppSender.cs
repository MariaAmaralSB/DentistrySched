using Microsoft.Extensions.Logging;

public interface IWhatsAppSender
{
    Task SendAsync(string to, string text, CancellationToken ct = default);
}

public class NullWhatsAppSender : IWhatsAppSender
{
    private readonly ILogger<NullWhatsAppSender> _logger;
    public NullWhatsAppSender(ILogger<NullWhatsAppSender> logger) => _logger = logger;

    public Task SendAsync(string to, string text, CancellationToken ct = default)
    {
        _logger.LogInformation("WhatsApp (disabled) -> {To}: {Text}", to, text);
        return Task.CompletedTask;
    }
}
