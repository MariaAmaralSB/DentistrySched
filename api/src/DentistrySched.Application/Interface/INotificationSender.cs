public interface INotificationSender
{
    Task SendConfirmationAsync(string to, DateTime inicio, string? dentista, Guid consultaId, CancellationToken ct = default);
    Task SendCancellationAsync(string to, DateTime inicio, CancellationToken ct = default);
    Task SendRescheduleAsync(string to, DateTime novoInicio, string? dentista, CancellationToken ct = default);
}