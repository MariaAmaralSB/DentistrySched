using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("public")]
public class PublicConsultasQueryController : ControllerBase
{
    private readonly AppDbContext _db;
    public PublicConsultasQueryController(AppDbContext db) => _db = db;

    /// <summary>Detalhe de uma consulta pelo Id.</summary>
    [HttpGet("consultas/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetConsulta([FromRoute] Guid id, CancellationToken ct)
    {
        var c = await _db.Consultas
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return c is null ? NotFound() : Ok(c);
    }

    /// <summary>Lista consultas de um paciente pelo celular (últimos 6 meses).</summary>
    [HttpGet("consultas/por-celular")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPorCelular([FromQuery] string celular, CancellationToken ct)
    {
        var paciente = await _db.Pacientes
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CelularWhatsApp == celular, ct);

        if (paciente is null) return Ok(Array.Empty<object>());

        var desde = DateTime.UtcNow.AddMonths(-6);

        var consultas = await _db.Consultas
            .AsNoTracking()
            .Where(c => c.PacienteId == paciente.Id && c.Inicio >= desde)
            .OrderBy(c => c.Inicio)
            .Select(c => new
            {
                c.Id,
                c.DentistaId,
                c.ProcedimentoId,
                c.Inicio,
                c.Fim,
                c.Status
            })
            .ToListAsync(ct);

        return Ok(consultas);
    }
}
