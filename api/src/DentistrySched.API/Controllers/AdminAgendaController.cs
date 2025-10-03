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

    // ------------------------------------------------------------
    // Regras semanais (GET/PUT/POST)
    // ------------------------------------------------------------

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
            .Select(r => new { r.DiaSemana, r.InicioManha, r.FimManha, r.InicioTarde, r.FimTarde })
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

            novas.Add(new AgendaRegra
            {
                DentistaId = dentistaId,
                DiaSemana = dto.DiaSemana,
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

    [HttpPost("{dentistaId:guid}")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Post(Guid dentistaId, [FromBody] List<AgendaRegraUpsertDto> regras, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (regras is null || regras.Count == 0) return BadRequest("Informe ao menos uma regra.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        var dias = regras.Select(r => r.DiaSemana).Distinct().ToArray();

        await _db.AgendaRegras
            .Where(r => r.DentistaId == dentistaId && dias.Contains(r.DiaSemana))
            .ExecuteDeleteAsync(ct);

        var novas = new List<AgendaRegra>(regras.Count);

        foreach (var dto in regras)
        {
            if (!TryParse(dto, out var im, out var fm, out var it, out var ft, out var erro))
                return BadRequest(erro);

            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            novas.Add(new AgendaRegra
            {
                DentistaId = dentistaId,
                DiaSemana = dto.DiaSemana,
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

        var regs = await _db.AgendaRegras.AsNoTracking()
            .Where(r => r.DentistaId == dentistaId)
            .OrderBy(r => r.DiaSemana)
            .Select(x => new
            {
                x.DiaSemana,
                InicioManha = x.InicioManha == default ? null : x.InicioManha.ToString("HH:mm"),
                FimManha = x.FimManha == default ? null : x.FimManha.ToString("HH:mm"),
                InicioTarde = x.InicioTarde.HasValue ? x.InicioTarde.Value.ToString("HH:mm") : null,
                FimTarde = x.FimTarde.HasValue ? x.FimTarde.Value.ToString("HH:mm") : null
            })
            .ToListAsync(ct);

        return CreatedAtAction(nameof(Get), new { dentistaId }, regs);
    }

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

    // ------------------------------------------------------------
    // Status LEVE do mês (apenas aberto/fechado/parcial por dia)
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Detalhe do dia (sob demanda) — otimizado
    // ------------------------------------------------------------

    [HttpGet("/admin/agenda-dia")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetDia(
        [FromQuery] Guid dentistaId,
        [FromQuery] DateOnly data,
        [FromQuery] Guid? procedimentoId,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        var sw = System.Diagnostics.Stopwatch.StartNew();

        Guid procId;
        try
        {
            procId = await ProcPadrao(_db, ct, procedimentoId);
        }
        catch (InvalidOperationException ex)
        {
            return Ok(new { dia = data.Day, livres = 0, ocupados = 0, total = 0, slots = Array.Empty<object>(), msg = ex.Message });
        }

        _db.Database.SetCommandTimeout(10); // opcional
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
            hora = SafeHour(s.HoraISO),   // "HH:mm"
            status = GetStatusLight(s)    // 0/1 ou o que sua UI espera
        }).ToList();

        sw.Stop();

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
            if (i > 0 && i + 6 <= iso.Length) // "T" + "HH:mm"
                return iso.Substring(i + 1, 5);
            return iso;
        }

        static int GetStatusLight(SlotDto s)
        {
            var pOcc = typeof(SlotDto).GetProperty("Ocupado");
            if (pOcc != null)
            {
                var v = pOcc.GetValue(s);
                if (v is bool b) return b ? 1 : 0;
            }

            var pStat = typeof(SlotDto).GetProperty("Status");
            if (pStat != null)
            {
                var v = pStat.GetValue(s);
                if (v is int i) return i;
                if (v != null && int.TryParse(v.ToString(), out var j)) return j;
            }

            return 0;
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
            e = new AgendaExcecao
            {
                DentistaId = dto.DentistaId,
                Data = dto.Data
            };
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

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

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

        // Busca apenas o Guid (no-tracking)
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
