using DentistrySched.Domain.Entities;
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

                var amanha = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
                var consultas = await db.Consultas
                    .Include(c => c.PreTriagem)
                    .Where(c => DateOnly.FromDateTime(c.Inicio) == amanha && c.Status == ConsultaStatus.Agendada)
                    .ToListAsync(stoppingToken);

                foreach (var c in consultas)
                {
                    _logger.LogInformation(
                        "📲 Lembrete: Consulta amanhã às {Hora} com paciente {PacienteId}",
                        c.Inicio, c.PacienteId
                    );

                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no serviço de lembrete");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
