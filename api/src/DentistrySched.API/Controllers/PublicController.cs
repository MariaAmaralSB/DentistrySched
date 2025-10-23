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
    [Produces("application/json")]
    public async Task<IActionResult> GetSlots(
    [FromQuery] Guid dentistaId,
    [FromQuery] Guid procedimentoId,
    [FromQuery] string data,          
    CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (procedimentoId == Guid.Empty) return BadRequest("procedimentoId obrigatório.");
        if (string.IsNullOrWhiteSpace(data)) return BadRequest("data obrigatória (yyyy-MM-dd).");

        if (!DateOnly.TryParseExact(data, "yyyy-MM-dd", out var dia))
            return BadRequest("data inválida. Use yyyy-MM-dd.");

        var slots = await _slots.GerarSlotsAsync(dia, dentistaId, procedimentoId, ct);

        var exc = await _db.AgendaExcecoes.AsNoTracking()
            .Where(e => e.DentistaId == dentistaId && e.Data == dia)
            .Select(e => new
            {
                e.FechadoDiaTodo,
                e.AbrirManhaDe,
                e.AbrirManhaAte,
                e.AbrirTardeDe,
                e.AbrirTardeAte
            })
            .FirstOrDefaultAsync(ct);

        if (exc is not null)
        {
            if (exc.FechadoDiaTodo == true)
            {
                slots = Array.Empty<SlotDto>();
            }
            else
            {
                var temManha = exc.AbrirManhaDe.HasValue && exc.AbrirManhaAte.HasValue;
                var temTarde = exc.AbrirTardeDe.HasValue && exc.AbrirTardeAte.HasValue;

                if (temManha || temTarde)
                {
                    var manhaDe = exc.AbrirManhaDe ?? default;
                    var manhaAte = exc.AbrirManhaAte ?? default;
                    var tardeDe = exc.AbrirTardeDe ?? default;
                    var tardeAte = exc.AbrirTardeAte ?? default;

                    var filtrados = new List<SlotDto>(slots.Count);
                    foreach (var s in slots)
                    {
                        var t = TimeOnly.FromDateTime(
                            DateTime.Parse(s.HoraISO, null, System.Globalization.DateTimeStyles.RoundtripKind));

                        var ok = (temManha && t >= manhaDe && t <= manhaAte)
                              || (temTarde && t >= tardeDe && t <= tardeAte);

                        if (ok) filtrados.Add(s);
                    }
                    slots = filtrados;
                }
            }
        }

        var resp = slots.Select(s => new { horaISO = s.HoraISO }).ToList();
        return Ok(resp);
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
    [HttpGet("agenda/semana")]
    [Produces("application/json")]
    public async Task<IActionResult> GetAgendaSemana(
    [FromQuery] Guid dentistaId,
    [FromQuery] Guid procedimentoId,
    [FromQuery] string inicio, 
    CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (procedimentoId == Guid.Empty) return BadRequest("procedimentoId obrigatório.");
        if (!DateOnly.TryParseExact(inicio, "yyyy-MM-dd", out var dia0))
            return BadRequest("inicio inválido. Use yyyy-MM-dd.");

        var dow = (int)dia0.DayOfWeek; 
        var segunda = dia0.AddDays(dow == 0 ? -6 : 1 - dow);

        var dias = Enumerable.Range(0, 7).Select(i => segunda.AddDays(i)).ToList();
        var lista = new List<AgendaSemanaDiaDto>(7);

        foreach (var d in dias)
        {
            var slots = await _slots.GerarSlotsAsync(d, dentistaId, procedimentoId, ct);

            var exc = await _db.AgendaExcecoes.AsNoTracking()
                .Where(e => e.DentistaId == dentistaId && e.Data == d)
                .Select(e => new { e.FechadoDiaTodo, e.AbrirManhaDe, e.AbrirManhaAte, e.AbrirTardeDe, e.AbrirTardeAte })
                .FirstOrDefaultAsync(ct);

            if (exc is not null)
            {
                if (exc.FechadoDiaTodo == true)
                {
                    slots = [];
                }
                else
                {
                    var temManha = exc.AbrirManhaDe.HasValue && exc.AbrirManhaAte.HasValue;
                    var temTarde = exc.AbrirTardeDe.HasValue && exc.AbrirTardeAte.HasValue;
                    if (temManha || temTarde)
                    {
                        var manhaDe = exc.AbrirManhaDe ?? default;
                        var manhaAte = exc.AbrirManhaAte ?? default;
                        var tardeDe = exc.AbrirTardeDe ?? default;
                        var tardeAte = exc.AbrirTardeAte ?? default;

                        slots = slots.Where(s =>
                        {
                            var t = TimeOnly.FromDateTime(DateTime.Parse(s.HoraISO, null, System.Globalization.DateTimeStyles.RoundtripKind));
                            var ok = (temManha && t >= manhaDe && t <= manhaAte)
                                  || (temTarde && t >= tardeDe && t <= tardeAte);
                            return ok;
                        }).ToList();
                    }
                }
            }

            var ini = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var fim = d.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

            var ocupados = await _db.Consultas.AsNoTracking()
                .Where(c => c.DentistaId == dentistaId
                         && c.ProcedimentoId == procedimentoId
                         && c.Status != Domain.Enums.ConsultaStatus.Cancelada
                         && c.Inicio >= ini && c.Inicio <= fim)
                .CountAsync(ct);

            var livres = Math.Max(slots.Count - ocupados, 0);

            string? primeiroLivre = null;
            if (slots.Count > 0)
            {
                var primeiro = slots.MinBy(s => s.HoraISO);
                if (primeiro is not null)
                {
                    var t = DateTime.Parse(primeiro.HoraISO, null, System.Globalization.DateTimeStyles.RoundtripKind);
                    primeiroLivre = t.ToString("HH:mm");
                }
            }

            lista.Add(new AgendaSemanaDiaDto(d, livres, ocupados, primeiroLivre));
        }

        return Ok(lista);
    }
}
