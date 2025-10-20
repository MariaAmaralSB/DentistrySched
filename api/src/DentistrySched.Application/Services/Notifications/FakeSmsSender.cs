using Microsoft.Extensions.Logging;

public class FakeSmsSender : ISmsSender
{
    private readonly ILogger<FakeSmsSender> _logger;
    public FakeSmsSender(ILogger<FakeSmsSender> logger) => _logger = logger;

    public Task SendAsync(string to, string text, CancellationToken ct = default)
    {
        _logger.LogInformation("SMS -> {To}: {Text}", to, text);
        return Task.CompletedTask;
    }
}
