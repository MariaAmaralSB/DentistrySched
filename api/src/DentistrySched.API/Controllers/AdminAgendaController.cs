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

    // GET /admin/agenda-regras?dentistaId=GUID
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid dentistaId, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        var regras = await _db.AgendaRegras.AsNoTracking()
            .Where(r => r.DentistaId == dentistaId)
            .OrderBy(r => r.DiaSemana)
            .ToListAsync(ct);

        var dto = regras.Select(x => new
        {
            x.DiaSemana,
            InicioManha = x.InicioManha == default ? null : x.InicioManha.ToString("HH:mm"),
            FimManha = x.FimManha == default ? null : x.FimManha.ToString("HH:mm"),
            InicioTarde = x.InicioTarde?.ToString("HH:mm"),
            FimTarde = x.FimTarde?.ToString("HH:mm")
        });

        return Ok(dto);
    }

    // PUT /admin/agenda-regras/{dentistaId} -> substitui a semana inteira do dentista
    [HttpPut("{dentistaId:guid}")]
    public async Task<IActionResult> Put(Guid dentistaId, [FromBody] List<AgendaRegraUpsertDto> regras, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");

        var existentes = await _db.AgendaRegras
            .Where(r => r.DentistaId == dentistaId)
            .ToListAsync(ct);

        _db.AgendaRegras.RemoveRange(existentes);

        foreach (var dto in regras)
        {
            var (im, fm, it, ft) = Parse(dto);
            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            _db.AgendaRegras.Add(new Domain.Entities.AgendaRegra
            {
                DentistaId = dentistaId,
                DiaSemana = dto.DiaSemana,
                InicioManha = im ?? default,
                FimManha = fm ?? default,
                InicioTarde = it,
                FimTarde = ft
            });
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // POST /admin/agenda-regras/{dentistaId} -> atualiza apenas os dias enviados
    [HttpPost("{dentistaId:guid}")]
    public async Task<IActionResult> Post(Guid dentistaId, [FromBody] List<AgendaRegraUpsertDto> regras, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (regras is null || regras.Count == 0) return BadRequest("Informe ao menos uma regra.");

        var dias = regras.Select(r => r.DiaSemana).Distinct().ToArray();

        var existentes = await _db.AgendaRegras
            .Where(r => r.DentistaId == dentistaId && dias.Contains(r.DiaSemana))
            .ToListAsync(ct);

        _db.AgendaRegras.RemoveRange(existentes);

        foreach (var dto in regras)
        {
            var (im, fm, it, ft) = Parse(dto);
            var temManha = im.HasValue && fm.HasValue;
            var temTarde = it.HasValue && ft.HasValue;
            if (!temManha && !temTarde) continue;

            _db.AgendaRegras.Add(new Domain.Entities.AgendaRegra
            {
                DentistaId = dentistaId,
                DiaSemana = dto.DiaSemana,
                InicioManha = im ?? default,
                FimManha = fm ?? default,
                InicioTarde = it,
                FimTarde = ft
            });
        }

        await _db.SaveChangesAsync(ct);

      
        var regs = await _db.AgendaRegras.AsNoTracking()
            .Where(r => r.DentistaId == dentistaId)
            .OrderBy(r => r.DiaSemana)
        .ToListAsync(ct); 

        var result = regs.Select(x => new
        {
            x.DiaSemana,
            InicioManha = x.InicioManha == default ? null : x.InicioManha.ToString("HH:mm"),
            FimManha = x.FimManha == default ? null : x.FimManha.ToString("HH:mm"),
            InicioTarde = x.InicioTarde.HasValue ? x.InicioTarde.Value.ToString("HH:mm") : null,
            FimTarde = x.FimTarde.HasValue ? x.FimTarde.Value.ToString("HH:mm") : null
        }).ToList();

        return CreatedAtAction(nameof(Get), new { dentistaId }, result);
    }

    private static (TimeOnly? im, TimeOnly? fm, TimeOnly? it, TimeOnly? ft) Parse(AgendaRegraUpsertDto dto)
    {
        TimeOnly? P(string? s) => string.IsNullOrWhiteSpace(s) ? null : TimeOnly.ParseExact(s, "HH:mm");

        var im = P(dto.InicioManha);
        var fm = P(dto.FimManha);
        var it = P(dto.InicioTarde);
        var ft = P(dto.FimTarde);

        if (im.HasValue && fm.HasValue && im.Value >= fm.Value)
            throw new ArgumentException($"Período da manhã inválido em {dto.DiaSemana}");
        if (it.HasValue && ft.HasValue && it.Value >= ft.Value)
            throw new ArgumentException($"Período da tarde inválido em {dto.DiaSemana}");

        return (im, fm, it, ft);
    }
}
