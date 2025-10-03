using DentistrySched.Domain.Enums;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace DentistrySched.API.Services;

public class ConsultaReminderService : BackgroundService
{
    private readonly IServiceProvider _provider;
    private readonly ILogger<ConsultaReminderService> _logger;

    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(10);

    public ConsultaReminderService(IServiceProvider provider, ILogger<ConsultaReminderService> logger)
    {
        _provider = provider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _provider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var start = DateTime.UtcNow.Date.AddDays(1); 
                var end = start.AddDays(1);                

                var consultas = await db.Consultas
                    .AsNoTracking() 
                                    
                    .Where(c =>
                        c.Inicio >= start &&
                        c.Inicio < end &&
                        c.Status == ConsultaStatus.Agendada)
                    .Select(c => new
                    {
                        c.Id,
                        c.Inicio,
                        c.PacienteId 
                    })
                    .ToListAsync(stoppingToken);

                foreach (var c in consultas)
                {
                    _logger.LogInformation(
                        "📲 Lembrete: Consulta amanhã às {Hora} (UTC) para paciente {PacienteId}",
                        c.Inicio, c.PacienteId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no serviço de lembrete");
            }

            try
            {
                await Task.Delay(Intervalo, stoppingToken);
            }
            catch (OperationCanceledException) { }
        }
    }
}
