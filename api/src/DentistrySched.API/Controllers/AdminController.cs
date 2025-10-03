using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin")]
[Produces("application/json")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminController(AppDbContext db) => _db = db;

    public record ProcedimentoQuery(
        string? q = null,
        int page = 1,
        int pageSize = 20,
        string orderBy = "nome",
        bool desc = false
    );

    public record ProcedimentoDto(
        Guid Id,
        string Nome,
        int DuracaoMin,
        int BufferMin
    );

    public record ProcedimentoUpsertDto(
        string Nome,
        int DuracaoMin,
        int BufferMin
    );

    [HttpGet("procedimentos")]
    public async Task<IActionResult> GetProcedimentos(
        [FromQuery] ProcedimentoQuery query,
        CancellationToken ct)
    {
        var page = query.page < 1 ? 1 : query.page;
        var size = query.pageSize is < 1 or > 100 ? 20 : query.pageSize;

        IQueryable<Domain.Entities.Procedimento> baseQ =
            _db.Procedimentos.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.q))
        {
            var like = $"%{query.q.Trim()}%";
            baseQ = baseQ.Where(p => EF.Functions.Like(p.Nome, like));
        }

        baseQ = query.desc ? baseQ.OrderByDescending(p => p.Nome)
                           : baseQ.OrderBy(p => p.Nome);

        var total = await baseQ.CountAsync(ct);

        var items = await baseQ
            .Skip((page - 1) * size)
            .Take(size)
            .Select(p => new ProcedimentoDto(p.Id, p.Nome, p.DuracaoMin, p.BufferMin))
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize = size, items });
    }

    [HttpGet("procedimentos/{id:guid}")]
    public async Task<IActionResult> GetProcedimentoById(Guid id, CancellationToken ct)
    {
        var p = await _db.Procedimentos
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ProcedimentoDto(x.Id, x.Nome, x.DuracaoMin, x.BufferMin))
            .FirstOrDefaultAsync(ct);

        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost("procedimentos")]
    public async Task<IActionResult> CreateProcedimento(
        [FromBody] ProcedimentoUpsertDto dto,
        CancellationToken ct)
    {
        var msg = Validate(dto);
        if (msg is not null) return BadRequest(msg);

        var nomeNorm = dto.Nome.Trim();
        var jaExiste = await _db.Procedimentos
            .AnyAsync(p => p.Nome.ToLower() == nomeNorm.ToLower(), ct);
        if (jaExiste) return BadRequest("Já existe um procedimento com esse nome.");

        var entity = new Domain.Entities.Procedimento
        {
            Id = Guid.NewGuid(),
            Nome = nomeNorm,
            DuracaoMin = dto.DuracaoMin,
            BufferMin = dto.BufferMin
        };

        _db.Procedimentos.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = new ProcedimentoDto(entity.Id, entity.Nome, entity.DuracaoMin, entity.BufferMin);
        return CreatedAtAction(nameof(GetProcedimentoById), new { id = entity.Id }, result);
    }

    [HttpPut("procedimentos/{id:guid}")]
    public async Task<IActionResult> UpdateProcedimento(
        Guid id,
        [FromBody] ProcedimentoUpsertDto dto,
        CancellationToken ct)
    {
        if (id == Guid.Empty) return BadRequest("Id inválido.");

        var msg = Validate(dto);
        if (msg is not null) return BadRequest(msg);

        var entity = await _db.Procedimentos.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null) return NotFound();

        var nomeNorm = dto.Nome.Trim();

        var conflito = await _db.Procedimentos
            .AnyAsync(p => p.Id != id && p.Nome.ToLower() == nomeNorm.ToLower(), ct);
        if (conflito) return BadRequest("Já existe um procedimento com esse nome.");

        entity.Nome = nomeNorm;
        entity.DuracaoMin = dto.DuracaoMin;
        entity.BufferMin = dto.BufferMin;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("procedimentos/{id:guid}")]
    public async Task<IActionResult> DeleteProcedimento(Guid id, CancellationToken ct)
    {
        if (id == Guid.Empty) return BadRequest("Id inválido.");

        var exists = await _db.Procedimentos.AnyAsync(p => p.Id == id, ct);
        if (!exists) return NotFound();

        // se houver FK de consultas -> considere checar antes
        await _db.Procedimentos
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }

    private static string? Validate(ProcedimentoUpsertDto dto)
    {
        if (dto is null) return "Payload obrigatório.";
        if (string.IsNullOrWhiteSpace(dto.Nome)) return "Nome é obrigatório.";
        if (dto.DuracaoMin is < 5 or > 480) return "Duração deve estar entre 5 e 480 minutos.";
        if (dto.BufferMin is < 0 or > 120) return "Buffer deve estar entre 0 e 120 minutos.";
        return null;
    }
}
