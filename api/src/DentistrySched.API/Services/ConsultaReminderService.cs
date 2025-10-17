using DentistrySched.Domain.Enums;
using DentistrySched.Infrastructure;
using DentistrySched.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Services;

public class ConsultaReminderService : BackgroundService
{
    private readonly IServiceProvider _provider;
    private readonly ILogger<ConsultaReminderService> _logger;
    private readonly IConfiguration _cfg;

    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(10);

    public ConsultaReminderService(
        IServiceProvider provider,
        ILogger<ConsultaReminderService> logger,
        IConfiguration cfg)
    {
        _provider = provider;
        _logger = logger;
        _cfg = cfg;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var tenantIds = new List<Guid>();
                if (Guid.TryParse(_cfg["Tenants:Default"], out var defTid))
                    tenantIds.Add(defTid);

                var extras = _cfg.GetSection("Tenants:Extras").Get<string[]>() ?? Array.Empty<string>();
                foreach (var s in extras)
                    if (Guid.TryParse(s, out var g)) tenantIds.Add(g);

                if (tenantIds.Count == 0)
                    tenantIds.Add(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")); 

                foreach (var tid in tenantIds.Distinct())
                {
                    using var scope = _provider.CreateScope();

                    var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
                    tenantProvider.TenantId = tid;

                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var start = DateTime.UtcNow.Date.AddDays(1);
                    var end = start.AddDays(1);

                    var consultas = await db.Consultas
                        .AsNoTracking()
                        .Where(c => c.Inicio >= start &&
                                    c.Inicio < end &&
                                    c.Status == ConsultaStatus.Agendada)
                        .Select(c => new { c.Id, c.Inicio, c.PacienteId })
                        .ToListAsync(stoppingToken);

                    foreach (var c in consultas)
                    {
                        _logger.LogInformation(
                            "📲 [Tenant {TenantId}] Lembrete: Consulta amanhã às {Hora} (UTC) para paciente {PacienteId}",
                            tid, c.Inicio, c.PacienteId);
                    }
                }
            }
            catch (OperationCanceledException)
            {
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
