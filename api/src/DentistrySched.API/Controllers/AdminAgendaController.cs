using DentistrySched.Application.DTO;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/agenda-regras")]
public class AdminAgendaController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminAgendaController(AppDbContext db) => _db = db;

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

        var novas = new List<Domain.Entities.AgendaRegra>(regras?.Count ?? 0);

        foreach (var dto in regras ?? [])
        {
            if (!TryParse(dto, out var im, out var fm, out var it, out var ft, out var erro))
                return BadRequest(erro);

            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            novas.Add(new Domain.Entities.AgendaRegra
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

        var novas = new List<Domain.Entities.AgendaRegra>(regras.Count);

        foreach (var dto in regras)
        {
            if (!TryParse(dto, out var im, out var fm, out var it, out var ft, out var erro))
                return BadRequest(erro);

            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            novas.Add(new Domain.Entities.AgendaRegra
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
}
