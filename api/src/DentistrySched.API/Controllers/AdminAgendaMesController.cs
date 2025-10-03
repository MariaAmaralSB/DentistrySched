using DentistrySched.Application.DTO;
using DentistrySched.Application.Interface;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/agenda-mes")]
public class AdminAgendaMesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISlotService _slots;

    public AdminAgendaMesController(AppDbContext db, ISlotService slots)
    {
        _db = db;
        _slots = slots;
    }

    /// <summary>
    /// Retorna um resumo do mês (por dia) com contagem de horários livres/ocupados
    /// e marcações de fechamento/exceções.
    /// GET /admin/agenda-mes?dentistaId=...&ano=2025&mes=10&procedimentoId=...
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(
    [FromQuery] Guid dentistaId,
    [FromQuery] int ano,
    [FromQuery] int mes,
    [FromQuery] Guid? procedimentoId,
    CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (ano < 2000 || mes is < 1 or > 12) return BadRequest("ano/mes inválidos.");

        var primeiro = new DateOnly(ano, mes, 1);
        var ultimo = primeiro.AddMonths(1).AddDays(-1);

        // Só checa exceções/fechamentos (leve!)
        var excecoes = await _db.AgendaExcecoes
            .AsNoTracking()
            .Where(e => e.DentistaId == dentistaId && e.Data >= primeiro && e.Data <= ultimo)
            .ToListAsync(ct);

        var dias = new List<DiaMesDto>(ultimo.Day);
        for (var d = 1; d <= ultimo.Day; d++)
        {
            var data = new DateOnly(ano, mes, d);
            var exc = excecoes.FirstOrDefault(x => x.Data == data);

            // não calcula slots aqui — tudo 0 (detalhe vem no clique)
            var fechado = exc?.FechadoDiaTodo == true;
            dias.Add(new DiaMesDto(d, fechado, 0, 0, 0, exc?.Motivo));
        }

        return Ok(dias);
    }

    [HttpGet("/admin/agenda-dia")]
    public async Task<IActionResult> GetDia(
    [FromQuery] Guid dentistaId,
    [FromQuery] DateOnly data,
    [FromQuery] Guid? procedimentoId,
    CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        var procId = procedimentoId ?? await ProcPadrao(_db, ct);

        var slots = await _slots.GerarSlotsAsync(data, dentistaId, procId, ct);

        var exc = await _db.AgendaExcecoes.AsNoTracking()
            .FirstOrDefaultAsync(e => e.DentistaId == dentistaId && e.Data == data, ct);
        if (exc is not null && (exc.AbrirManhaDe.HasValue || exc.AbrirTardeDe.HasValue))
        {
            slots = FiltrarPorExcecao(slots, exc);
        }

        var total = slots.Count;
        var ocupados = 0; 
        var livres = total - ocupados;

        return Ok(new
        {
            dia = data.Day,
            livres,
            ocupados,
            total,
            slots
        });
    }

    /// <summary>
    /// Procedimento padrão caso não seja informado.
    /// </summary>
    private static async Task<Guid> ProcPadrao(AppDbContext db, CancellationToken ct)
    {
        var p = await db.Procedimentos.AsNoTracking().FirstOrDefaultAsync(ct);
        if (p is null) throw new InvalidOperationException("Cadastre ao menos 1 procedimento.");
        return p.Id;
    }

    /// <summary>
    /// Filtra os slots de acordo com uma exceção de agenda (abre apenas os intervalos informados).
    /// Usa IReadOnlyList como entrada e saída (Opção A).
    /// </summary>
    private static IReadOnlyList<SlotDto> FiltrarPorExcecao(IReadOnlyList<SlotDto> slots, AgendaExcecao exc)
    {
        bool temManha = exc.AbrirManhaDe.HasValue && exc.AbrirManhaAte.HasValue;
        bool temTarde = exc.AbrirTardeDe.HasValue && exc.AbrirTardeAte.HasValue;
        if (!temManha && !temTarde) return slots;

        var manhaDe = exc.AbrirManhaDe.GetValueOrDefault();
        var manhaAte = exc.AbrirManhaAte.GetValueOrDefault();
        var tardeDe = exc.AbrirTardeDe.GetValueOrDefault();
        var tardeAte = exc.AbrirTardeAte.GetValueOrDefault();

        var list = new List<SlotDto>(slots.Count);
        foreach (var s in slots)
        {
            var t = TimeOnly.FromDateTime(DateTime.Parse(s.HoraISO, null, System.Globalization.DateTimeStyles.RoundtripKind));

            bool ok =
                (temManha && t >= manhaDe && t <= manhaAte) ||
                (temTarde && t >= tardeDe && t <= tardeAte);

            if (ok) list.Add(s);
        }
        return list;
    }

    /// <summary>
    /// DTO de resposta por dia do mês.
    /// </summary>
    public record DiaMesDto(
        int dia,
        bool fechado,
        int livres,
        int ocupados,
        int total,
        string? motivo
    );
}
