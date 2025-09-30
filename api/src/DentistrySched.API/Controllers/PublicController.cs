using DentistrySched.Application.DTO;
using DentistrySched.Application.Interface;
using DentistrySched.Domain.Entities;
using DentistrySched.Domain.Enums;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("public")]
public class PublicController : ControllerBase
{
    private readonly ISlotService _slots;
    private readonly AppDbContext _db;

    public PublicController(ISlotService slots, AppDbContext db)
    {
        _slots = slots;
        _db = db;
    }

    [HttpGet("slots")]
    public async Task<ActionResult<IReadOnlyList<SlotDto>>> GetSlots(
        [FromQuery] Guid dentistaId,
        [FromQuery] Guid procedimentoId,
        [FromQuery] DateOnly data,
        CancellationToken ct)
    {
        var result = await _slots.GerarSlotsAsync(data, dentistaId, procedimentoId, ct);
        return Ok(result);
    }

    [HttpPost("consultas")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<Guid>> CriarConsulta([FromBody] CriarConsultaDto dto, CancellationToken ct)
    {
        var proc = await _db.Procedimentos.FindAsync(new object?[] { dto.ProcedimentoId }, ct);
        if (proc is null) return BadRequest("Procedimento inválido.");

        var fim = dto.Inicio.AddMinutes(proc.DuracaoMin + proc.BufferMin);

        var conflito = await _db.Consultas.AnyAsync(c =>
            c.DentistaId == dto.DentistaId &&
            c.Status != ConsultaStatus.Cancelada &&
            !(fim <= c.Inicio || dto.Inicio >= c.Fim), ct);

        if (conflito) return Conflict("Horário indisponível.");

        var paciente = await _db.Pacientes.FirstOrDefaultAsync(p => p.CelularWhatsApp == dto.CelularWhatsApp, ct)
                       ?? new Paciente
                       {
                           Nome = dto.PacienteNome,
                           CelularWhatsApp = dto.CelularWhatsApp,
                           Email = dto.Email,
                           ConsentimentoWhatsApp = true
                       };

        if (_db.Entry(paciente).State == EntityState.Detached)
            _db.Pacientes.Add(paciente);

        var consulta = new Consulta
        {
            DentistaId = dto.DentistaId,
            PacienteId = paciente.Id,
            ProcedimentoId = dto.ProcedimentoId,
            Inicio = dto.Inicio,
            Fim = fim,
            Status = ConsultaStatus.Agendada,
            PreTriagem = new PreTriagem
            {
                Descricao = dto.Descricao,
                Sintomas = dto.Sintomas ?? Array.Empty<string>()
            }
        };

        _db.Consultas.Add(consulta);
        await _db.SaveChangesAsync(ct);

        return Ok(consulta.Id);
    }

    [HttpPut("consultas/{id:guid}/confirmar")]
    public async Task<IActionResult> ConfirmarConsulta([FromRoute] Guid id, [FromBody] ConfirmarConsultaDto? dto, CancellationToken ct)
    {
        var consulta = await _db.Consultas.FindAsync(new object?[] { id }, ct);
        if (consulta is null) return NotFound();
        if (consulta.Status == ConsultaStatus.Cancelada) return Conflict("Consulta já cancelada.");

        consulta.Status = ConsultaStatus.Confirmada;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("consultas/{id:guid}/cancelar")]
    public async Task<IActionResult> CancelarConsulta([FromRoute] Guid id, [FromBody] CancelarConsultaDto? dto, CancellationToken ct)
    {
        var consulta = await _db.Consultas.FindAsync(new object?[] { id }, ct);
        if (consulta is null) return NotFound();

        if (consulta.Status != ConsultaStatus.Cancelada)
        {
            consulta.Status = ConsultaStatus.Cancelada;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPut("consultas/{id:guid}/remarcar")]
    public async Task<IActionResult> RemarcarConsulta([FromRoute] Guid id, [FromBody] RemarcarConsultaDto dto, CancellationToken ct)
    {
        var consulta = await _db.Consultas.FindAsync(new object?[] { id }, ct);
        if (consulta is null) return NotFound();

        var proc = await _db.Procedimentos.FindAsync(new object?[] { consulta.ProcedimentoId }, ct);
        if (proc is null) return Problem("Procedimento não encontrado.");

        var novoInicio = dto.NovoInicio;
        var novoFim = novoInicio.AddMinutes(proc.DuracaoMin + proc.BufferMin);

        var conflito = await _db.Consultas.AnyAsync(c =>
            c.Id != consulta.Id &&
            c.DentistaId == consulta.DentistaId &&
            c.Status != ConsultaStatus.Cancelada &&
            !(novoFim <= c.Inicio || novoInicio >= c.Fim), ct);

        if (conflito) return Conflict("Novo horário indisponível.");

        consulta.Inicio = novoInicio;
        consulta.Fim = novoFim;
        consulta.Status = ConsultaStatus.Remarcada;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
