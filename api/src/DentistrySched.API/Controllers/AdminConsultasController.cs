using DentistrySched.Application.DTO;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/consultas")]
public class AdminConsultasController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminConsultasController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgendaDoDia(
        [FromQuery] DateOnly data,
        [FromQuery] Guid? dentistaId,
        CancellationToken ct)
    {
        var inicio = data.ToDateTime(TimeOnly.MinValue);
        var fim = data.ToDateTime(TimeOnly.MaxValue);

        var baseQuery = _db.Consultas.AsNoTracking()
            .Where(c => c.Inicio >= inicio && c.Inicio <= fim);

        if (dentistaId is Guid d && d != Guid.Empty)
            baseQuery = baseQuery.Where(c => c.DentistaId == d);

        var itens = await (
            from c in baseQuery
            join den in _db.Dentistas.AsNoTracking() on c.DentistaId equals den.Id
            join pac in _db.Pacientes.AsNoTracking() on c.PacienteId equals pac.Id
            join proc in _db.Procedimentos.AsNoTracking() on c.ProcedimentoId equals proc.Id
            orderby c.Inicio
            select new AgendaDiaItemDto
            {
                Id = c.Id,
                Inicio = c.Inicio,
                Fim = c.Fim,
                Status = (int)c.Status,

                DentistaId = den.Id,
                DentistaNome = den.Nome,

                PacienteId = pac.Id,
                PacienteNome = pac.Nome,

                ProcedimentoId = proc.Id,
                ProcedimentoNome = proc.Nome
            }
        ).ToListAsync(ct);

        return Ok(itens);
    }
}