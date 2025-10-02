using DentistrySched.Application.DTO;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/dentistas")]
public class AdminDentistasController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminDentistasController(AppDbContext db) => _db = db;

    /// <summary>Lista todos os dentistas.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var itens = await _db.Dentistas.AsNoTracking()
            .OrderBy(x => x.Nome)
            .ToListAsync(ct);
        return Ok(itens);
    }

    /// <summary>Cadastra um dentista.</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] DentistaUpsertDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome) || dto.Nome.Length > 120)
            return BadRequest("Nome é obrigatório e deve ter até 120 caracteres.");

        var entity = new Dentista
        {
            Nome = dto.Nome.Trim(),
            CRO = string.IsNullOrWhiteSpace(dto.CRO) ? null : dto.CRO.Trim()
        };

        _db.Dentistas.Add(entity);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    /// <summary>Obtém um dentista por Id.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken ct)
    {
        var d = await _db.Dentistas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return d is null ? NotFound() : Ok(d);
    }

    /// <summary>Atualiza um dentista.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] DentistaUpsertDto dto, CancellationToken ct)
    {
        var d = await _db.Dentistas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Nome) || dto.Nome.Length > 120)
            return BadRequest("Nome é obrigatório e deve ter até 120 caracteres.");

        d.Nome = dto.Nome.Trim();
        d.CRO = string.IsNullOrWhiteSpace(dto.CRO) ? null : dto.CRO.Trim();

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Remove um dentista (se não tiver consultas associadas).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
    {
        var d = await _db.Dentistas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();

        var temConsultas = await _db.Consultas.AnyAsync(c => c.DentistaId == id, ct);
        if (temConsultas) return Conflict("Não é possível remover: existem consultas associadas.");

        _db.Dentistas.Remove(d);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
