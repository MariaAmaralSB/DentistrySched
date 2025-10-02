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

        var excecoes = await _db.AgendaExcecoes
            .Where(e => e.DentistaId == dentistaId && e.Data >= primeiro && e.Data <= ultimo)
            .ToListAsync(ct);

        var dias = new List<DiaMesDto>(ultimo.Day);

        for (var d = 1; d <= ultimo.Day; d++)
        {
            var data = new DateOnly(ano, mes, d);
            var exc = excecoes.FirstOrDefault(x => x.Data == data);

            if (exc?.FechadoDiaTodo == true)
            {
                dias.Add(new DiaMesDto(d, true, 0, 0, 0, exc.Motivo));
                continue;
            }

            var procId = procedimentoId ?? await ProcPadrao(_db, ct);

            IReadOnlyList<SlotDto> slots = await _slots.GerarSlotsAsync(
                data,
                dentistaId,
                procId,
                ct
            );

            int total = slots.Count;
            int ocupados = 0;
            int livres = total - ocupados;

            if (exc is not null)
            {
                slots = FiltrarPorExcecao(slots, exc);
                total = slots.Count;
                livres = total - ocupados;
            }

            dias.Add(new DiaMesDto(d, total == 0, livres, ocupados, total, exc?.Motivo));
        }

        return Ok(dias);
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
        bool temJanManha = exc.AbrirManhaDe.HasValue && exc.AbrirManhaAte.HasValue;
        bool temJanTarde = exc.AbrirTardeDe.HasValue && exc.AbrirTardeAte.HasValue;

        if (!temJanManha && !temJanTarde) return slots;

        var filtrados = slots.Where(s =>
        {
            var t = TimeOnly.FromDateTime(DateTime.Parse(s.HoraISO));
            bool dentroManha = temJanManha && t >= exc.AbrirManhaDe && t <= exc.AbrirManhaAte;
            bool dentroTarde = temJanTarde && t >= exc.AbrirTardeDe && t <= exc.AbrirTardeAte;
            return dentroManha || dentroTarde;
        }).ToList();

        return filtrados;
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
