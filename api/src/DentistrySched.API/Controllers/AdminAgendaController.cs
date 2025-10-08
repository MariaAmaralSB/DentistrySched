using DentistrySched.Application.DTO;
using DentistrySched.Application.Interface;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/agenda-regras")]
public class AdminAgendaController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISlotService _slots;

    public AdminAgendaController(AppDbContext db, ISlotService slots)
    {
        _db = db;
        _slots = slots;
    }

    // ============================================================
    // Regras semanais (GET / PUT / POST)
    // ============================================================

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Get([FromQuery] Guid dentistaId, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty)
            return BadRequest("dentistaId obrigatório.");

        var regs = await _db.AgendaRegras
            .AsNoTracking()
            .Where(r => r.DentistaId == dentistaId)
            .OrderBy(r => r.DiaSemana)
            .Select(r => new
            {
                DiaSemana = (int)r.DiaSemana, // enum -> int
                r.InicioManha,
                r.FimManha,
                r.InicioTarde,
                r.FimTarde
            })
            .ToListAsync(ct);

        var dto = regs.Select(x => new
        {
            x.DiaSemana,
            InicioManha = x.InicioManha == default ? null : x.InicioManha.ToString("HH:mm"),
            FimManha = x.FimManha == default ? null : x.FimManha.ToString("HH:mm"),
            InicioTarde = x.InicioTarde?.ToString("HH:mm"),
            FimTarde = x.FimTarde?.ToString("HH:mm"),
        });

        return Ok(dto);
    }

    [HttpPut("{dentistaId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Put(Guid dentistaId, [FromBody] List<AgendaRegraUpsertDto> regras, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        await _db.AgendaRegras
            .Where(r => r.DentistaId == dentistaId)
            .ExecuteDeleteAsync(ct);

        var novas = new List<AgendaRegra>(regras?.Count ?? 0);

        foreach (var dto in regras ?? [])
        {
            if (!TryParse(dto, out var im, out var fm, out var it, out var ft, out var erro))
                return BadRequest(erro);

            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            var diaEnum = (DayOfWeek)(dto.DiaSemana == 7 ? 0 : dto.DiaSemana);
            var diaInt = (int)diaEnum;           
            if (diaInt < 0 || diaInt > 6)
                return BadRequest($"DiaSemana inválido: {dto.DiaSemana}");

            novas.Add(new AgendaRegra
            {
                DentistaId = dentistaId,
                DiaSemana = diaEnum,           
                InicioManha = im ?? default,
                FimManha = fm ?? default,
                InicioTarde = it,
                FimTarde = ft
            });
        }


        if (novas.Count > 0)
            await _db.AgendaRegras.AddRangeAsync(novas, ct);

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return NoContent();
    }

    /// <summary>
    /// POST idempotente: atualiza/insere/remove somente os dias enviados.
    /// Aceita 7 = domingo (normaliza para 0). Valida horários “HH:mm”.
    /// </summary>
    [HttpPost("{dentistaId:guid}")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post(
        Guid dentistaId,
        [FromBody] IEnumerable<AgendaRegraUpsertDto> regras,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (regras is null) return BadRequest("Informe ao menos uma regra.");

        // 1) Normaliza/valida e pega o último valor de cada dia
        var norm = new List<NormDia>();
        foreach (var dto in regras)
        {
            var n = Normalize(dto, out var erro);
            if (erro is not null) return BadRequest(erro);
            if (n is not null) norm.Add(n);
        }

        var porDia = norm
            .GroupBy(n => n.Dia)
            .ToDictionary(g => g.Key, g => g.Last());

        if (porDia.Count == 0) return BadRequest("Nenhum horário válido.");

        // 2) Converte chaves (int) para enum DayOfWeek e busca apenas os dias impactados
        var diasPayloadEnum = porDia.Keys.Select(k => (DayOfWeek)k).ToArray();

        var atuais = await _db.AgendaRegras
            .Where(r => r.DentistaId == dentistaId && diasPayloadEnum.Contains(r.DiaSemana))
            .ToListAsync(ct);

        // 3) Upsert/Remove por dia
        foreach (var (diaInt, n) in porDia)
        {
            var diaEnum = (DayOfWeek)diaInt;

            var temManha = n.Im.HasValue && n.Fm.HasValue;
            var temTarde = n.It.HasValue && n.Ft.HasValue;

            var atual = atuais.FirstOrDefault(a => a.DiaSemana == diaEnum);

            if (!temManha && !temTarde)
            {
                if (atual is not null) _db.AgendaRegras.Remove(atual);
                continue;
            }

            if (atual is null)
            {
                _db.AgendaRegras.Add(new AgendaRegra
                {
                    DentistaId = dentistaId,
                    DiaSemana = diaEnum,         // << enum
                    InicioManha = n.Im ?? default,
                    FimManha = n.Fm ?? default,
                    InicioTarde = n.It,
                    FimTarde = n.Ft
                });
                continue;
            }

            bool mudou =
                atual.InicioManha != (n.Im ?? default) ||
                atual.FimManha != (n.Fm ?? default) ||
                atual.InicioTarde != n.It ||
                atual.FimTarde != n.Ft;

            if (mudou)
            {
                atual.InicioManha = n.Im ?? default;
                atual.FimManha = n.Fm ?? default;
                atual.InicioTarde = n.It;
                atual.FimTarde = n.Ft;
            }
        }

        await _db.SaveChangesAsync(ct);

        // 4) Snapshot para UI
        var regs = await _db.AgendaRegras.AsNoTracking()
            .Where(r => r.DentistaId == dentistaId)
            .OrderBy(r => r.DiaSemana)
            .Select(x => new
            {
                DiaSemana = (int)x.DiaSemana,
                InicioManha = x.InicioManha == default ? null : x.InicioManha.ToString("HH:mm"),
                FimManha = x.FimManha == default ? null : x.FimManha.ToString("HH:mm"),
                InicioTarde = x.InicioTarde.HasValue ? x.InicioTarde.Value.ToString("HH:mm") : null,
                FimTarde = x.FimTarde.HasValue ? x.FimTarde.Value.ToString("HH:mm") : null
            })
            .ToListAsync(ct);

        return CreatedAtAction(nameof(Get), new { dentistaId }, regs);
    }

    // ------------------------------------------------------------
    // Validação básica “HH:mm” + ordem
    // ------------------------------------------------------------
    private static bool TryParse(
        AgendaRegraUpsertDto dto,
        out TimeOnly? im, out TimeOnly? fm,
        out TimeOnly? it, out TimeOnly? ft,
        out string? erro)
    {
        im = fm = it = ft = null;
        erro = null;

        static bool Try(string? s, out TimeOnly? t)
        {
            if (string.IsNullOrWhiteSpace(s)) { t = null; return true; }
            var ok = TimeOnly.TryParseExact(s, "HH:mm", out var parsed);
            t = ok ? parsed : null;
            return ok;
        }

        if (!Try(dto.InicioManha, out im)) { erro = $"InicioManha inválido em {dto.DiaSemana}"; return false; }
        if (!Try(dto.FimManha, out fm)) { erro = $"FimManha inválido em {dto.DiaSemana}"; return false; }
        if (!Try(dto.InicioTarde, out it)) { erro = $"InicioTarde inválido em {dto.DiaSemana}"; return false; }
        if (!Try(dto.FimTarde, out ft)) { erro = $"FimTarde inválido em {dto.DiaSemana}"; return false; }

        if (im.HasValue && fm.HasValue && im.Value >= fm.Value)
        { erro = $"Período da manhã inválido em {dto.DiaSemana}"; return false; }

        if (it.HasValue && ft.HasValue && it.Value >= ft.Value)
        { erro = $"Período da tarde inválido em {dto.DiaSemana}"; return false; }

        return true;
    }

    // ===================== Status leve do mês ====================

    [HttpGet("/admin/agenda-regras/mes")]
    public async Task<IActionResult> GetMesStatus(
        [FromQuery] Guid dentistaId,
        [FromQuery] int ano,
        [FromQuery] int mes,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (ano < 2000 || mes is < 1 or > 12) return BadRequest("ano/mes inválidos.");

        var primeiro = new DateOnly(ano, mes, 1);
        var ultimo = primeiro.AddMonths(1).AddDays(-1);

        var excecoes = await _db.AgendaExcecoes
            .AsNoTracking()
            .Where(e => e.DentistaId == dentistaId && e.Data >= primeiro && e.Data <= ultimo)
            .Select(e => new { e.Data, e.FechadoDiaTodo, e.AbrirManhaDe, e.AbrirTardeDe, e.Motivo })
            .ToListAsync(ct);

        var dias = new List<object>(ultimo.Day);
        for (var d = 1; d <= ultimo.Day; d++)
        {
            var data = new DateOnly(ano, mes, d);
            var exc = excecoes.FirstOrDefault(x => x.Data == data);

            int status =
                exc?.FechadoDiaTodo == true ? 1 :
                (exc?.AbrirManhaDe.HasValue == true || exc?.AbrirTardeDe.HasValue == true) ? 2 : 0;

            dias.Add(new { dia = d, status, motivo = exc?.Motivo });
        }

        return Ok(dias);
    }

    // =================== Detalhe do dia (slots) ===================

    [HttpGet("/admin/agenda-dia")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetDia(
        [FromQuery] Guid dentistaId,
        [FromQuery] DateOnly data,
        [FromQuery] Guid? procedimentoId,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        Guid procId;
        try
        {
            procId = await ProcPadrao(_db, ct, procedimentoId);
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new { dia = data.Day, livres = 0, ocupados = 0, total = 0, slots = Array.Empty<object>(), msg = ex.Message });
        }

        var slots = await _slots.GerarSlotsAsync(data, dentistaId, procId, ct);

        var exc = await _db.AgendaExcecoes.AsNoTracking()
            .Where(e => e.DentistaId == dentistaId && e.Data == data)
            .Select(e => new { e.AbrirManhaDe, e.AbrirManhaAte, e.AbrirTardeDe, e.AbrirTardeAte })
            .FirstOrDefaultAsync(ct);

        if (exc is not null && (exc.AbrirManhaDe.HasValue || exc.AbrirTardeDe.HasValue))
        {
            slots = FiltrarPorExcecao(slots, new AgendaExcecao
            {
                AbrirManhaDe = exc.AbrirManhaDe,
                AbrirManhaAte = exc.AbrirManhaAte,
                AbrirTardeDe = exc.AbrirTardeDe,
                AbrirTardeAte = exc.AbrirTardeAte
            });
        }

        var light = slots.Select(s => new
        {
            hora = SafeHour(s.HoraISO),
            status = 0
        }).ToList();

        return Ok(new
        {
            dia = data.Day,
            livres = light.Count,
            ocupados = 0,
            total = light.Count,
            slots = light
        });

        static string SafeHour(string iso)
        {
            var i = iso.IndexOf('T');
            return (i > 0 && i + 6 <= iso.Length) ? iso.Substring(i + 1, 5) : iso;
        }
    }


    [HttpGet("/admin/agenda-excecao")]
    public async Task<IActionResult> GetExcecao(
        [FromQuery] Guid dentistaId,
        [FromQuery] DateOnly data,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        var e = await _db.AgendaExcecoes.AsNoTracking()
            .Where(x => x.DentistaId == dentistaId && x.Data == data)
            .Select(x => new ExcecaoDiaDto(
                x.DentistaId,
                x.Data,
                x.FechadoDiaTodo,
                x.AbrirManhaDe.HasValue ? x.AbrirManhaDe.Value.ToString("HH:mm") : null,
                x.AbrirManhaAte.HasValue ? x.AbrirManhaAte.Value.ToString("HH:mm") : null,
                x.AbrirTardeDe.HasValue ? x.AbrirTardeDe.Value.ToString("HH:mm") : null,
                x.AbrirTardeAte.HasValue ? x.AbrirTardeAte.Value.ToString("HH:mm") : null,
                x.Motivo
            ))
            .FirstOrDefaultAsync(ct);

        return Ok(e);
    }

    [HttpPut("/admin/agenda-excecao")]
    public async Task<IActionResult> UpsertExcecao(
        [FromBody] ExcecaoDiaDto dto,
        CancellationToken ct)
    {
        if (dto.DentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        static bool Try(string? s, out TimeOnly? t)
        {
            if (string.IsNullOrWhiteSpace(s)) { t = null; return true; }
            var ok = TimeOnly.TryParseExact(s, "HH:mm", out var v);
            t = ok ? v : null; return ok;
        }
        if (!Try(dto.AbrirManhaDe, out var manhaDe)) return BadRequest("AbrirManhaDe inválido");
        if (!Try(dto.AbrirManhaAte, out var manhaAte)) return BadRequest("AbrirManhaAte inválido");
        if (!Try(dto.AbrirTardeDe, out var tardeDe)) return BadRequest("AbrirTardeDe inválido");
        if (!Try(dto.AbrirTardeAte, out var tardeAte)) return BadRequest("AbrirTardeAte inválido");

        var e = await _db.AgendaExcecoes
            .FirstOrDefaultAsync(x => x.DentistaId == dto.DentistaId && x.Data == dto.Data, ct);

        if (e is null)
        {
            e = new AgendaExcecao { DentistaId = dto.DentistaId, Data = dto.Data };
            await _db.AgendaExcecoes.AddAsync(e, ct);
        }

        e.FechadoDiaTodo = dto.FechadoDiaTodo;
        e.AbrirManhaDe = manhaDe ?? default;
        e.AbrirManhaAte = manhaAte ?? default;
        e.AbrirTardeDe = tardeDe;
        e.AbrirTardeAte = tardeAte;
        e.Motivo = dto.Motivo;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("/admin/agenda-excecao")]
    public async Task<IActionResult> DeleteExcecao(
        [FromQuery] Guid dentistaId,
        [FromQuery] DateOnly data,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        await _db.AgendaExcecoes
            .Where(x => x.DentistaId == dentistaId && x.Data == data)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }

    private sealed record NormDia(int Dia, TimeOnly? Im, TimeOnly? Fm, TimeOnly? It, TimeOnly? Ft);

    private static NormDia? Normalize(AgendaRegraUpsertDto dto, out string? erro)
    {
        erro = null;

        var dia = dto.DiaSemana == 7 ? 0 : dto.DiaSemana;
        if (dia < 0 || dia > 6)
        { erro = $"DiaSemana inválido: {dto.DiaSemana}. Use 0..6 (Dom=0)."; return null; }

        static bool Try(string? s, out TimeOnly? t)
        {
            if (string.IsNullOrWhiteSpace(s)) { t = null; return true; }
            var ok = TimeOnly.TryParseExact(s.Trim(), "HH:mm", out var v);
            t = ok ? v : null; return ok;
        }

        if (!Try(dto.InicioManha, out var im)) { erro = $"InicioManha inválido em {dia}"; return null; }
        if (!Try(dto.FimManha, out var fm)) { erro = $"FimManha inválido em {dia}"; return null; }
        if (!Try(dto.InicioTarde, out var it)) { erro = $"InicioTarde inválido em {dia}"; return null; }
        if (!Try(dto.FimTarde, out var ft)) { erro = $"FimTarde inválido em {dia}"; return null; }

        if (im.HasValue && fm.HasValue && im.Value >= fm.Value)
        { erro = $"Período da manhã inválido (início >= fim) em {dia}"; return null; }

        if (it.HasValue && ft.HasValue && it.Value >= ft.Value)
        { erro = $"Período da tarde inválido (início >= fim) em {dia}"; return null; }

        return new NormDia(dia, im, fm, it, ft);
    }

    public record ExcecaoDiaDto(
        Guid DentistaId,
        DateOnly Data,
        bool FechadoDiaTodo,
        string? AbrirManhaDe,
        string? AbrirManhaAte,
        string? AbrirTardeDe,
        string? AbrirTardeAte,
        string? Motivo
    );

    private static async Task<Guid> ProcPadrao(AppDbContext db, CancellationToken ct, Guid? procedimentoId)
    {
        if (procedimentoId.HasValue && procedimentoId.Value != Guid.Empty)
            return procedimentoId.Value;

        var id = await db.Procedimentos
            .AsNoTracking()
            .Select(p => p.Id)
            .FirstOrDefaultAsync(ct);

        if (id == Guid.Empty)
            throw new InvalidOperationException("Cadastre ao menos 1 procedimento.");

        return id;
    }

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
            var t = TimeOnly.FromDateTime(DateTime.Parse(
                s.HoraISO, null, System.Globalization.DateTimeStyles.RoundtripKind));

            bool ok = (temManha && t >= manhaDe && t <= manhaAte)
                   || (temTarde && t >= tardeDe && t <= tardeAte);

            if (ok) list.Add(s);
        }
        return list;
    }
}
