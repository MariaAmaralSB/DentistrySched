using DentistrySched.Application.DTO;
using DentistrySched.Application.Interface; 
using DentistrySched.Domain.Entities;
using DentistrySched.Domain.Enums;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static DentistrySched.Application.DTO.RetornoDtos;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin/consultas")]
public class AdminConsultasController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISlotService _slots; 

    public AdminConsultasController(AppDbContext db, ISlotService slots)
    {
        _db = db;
        _slots = slots;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgendaDoDia(
        [FromQuery] DateOnly data,
        [FromQuery] Guid? dentistaId,
        CancellationToken ct)
    {
        var inicio = data.ToDateTime(TimeOnly.MinValue);
        var fim = inicio.AddDays(1);

        var baseQuery = _db.Consultas
            .AsNoTracking()
            .Where(c => c.Inicio >= inicio && c.Inicio < fim);

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

    [HttpGet("/admin/agenda-datas")]
    public async Task<IActionResult> GetDatas(
        [FromQuery] Guid dentistaId,
        [FromQuery] int ano,
        [FromQuery] int mes,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (ano < 2000 || mes is < 1 or > 12) return BadRequest("ano/mes inválidos.");

        var ini = new DateOnly(ano, mes, 1);
        var fim = ini.AddMonths(1).AddDays(-1);

        var rows = await _db.AgendaDatas.AsNoTracking()
            .Where(a => a.DentistaId == dentistaId && a.Data >= ini && a.Data <= fim)
            .OrderBy(a => a.Data)
            .Select(a => new
            {
                a.Data,
                a.ManhaDe,
                a.ManhaAte,
                a.TardeDe,
                a.TardeAte,
                a.Observacao
            })
            .ToListAsync(ct);

        var list = rows.Select(a => new AgendaDataViewDto(
            a.Data,
            a.ManhaDe?.ToString("HH:mm"),
            a.ManhaAte?.ToString("HH:mm"),
            a.TardeDe?.ToString("HH:mm"),
            a.TardeAte?.ToString("HH:mm"),
            a.Observacao
        )).ToList();

        return Ok(list);
    }

    [HttpPut("/admin/agenda-datas/{dentistaId:guid}")]
    public async Task<IActionResult> UpsertDatas(
        Guid dentistaId,
        [FromBody] IEnumerable<AgendaDataUpsertDto> dias,
        CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        if (dias is null) return BadRequest("Envie ao menos um item.");

        static bool Try(string? s, out TimeOnly? t)
        {
            if (string.IsNullOrWhiteSpace(s)) { t = null; return true; }
            var ok = TimeOnly.TryParseExact(s.Trim(), "HH:mm", out var v);
            t = ok ? v : null; return ok;
        }

        var payload = new List<(DateOnly data, TimeOnly? md, TimeOnly? ma, TimeOnly? td, TimeOnly? ta, string? obs)>();
        foreach (var d in dias)
        {
            if (!Try(d.ManhaDe, out var md) || !Try(d.ManhaAte, out var ma) ||
                !Try(d.TardeDe, out var td) || !Try(d.TardeAte, out var ta))
                return BadRequest($"Horários inválidos em {d.Data:yyyy-MM-dd}");

            if (md.HasValue && ma.HasValue && md.Value >= ma.Value)
                return BadRequest($"Janela da manhã inválida em {d.Data:yyyy-MM-dd} (início >= fim).");
            if (td.HasValue && ta.HasValue && td.Value >= ta.Value)
                return BadRequest($"Janela da tarde inválida em {d.Data:yyyy-MM-dd} (início >= fim).");

            payload.Add((d.Data, md, ma, td, ta, d.Observacao));
        }

        var datas = payload.Select(p => p.data).Distinct().ToArray();

        var atuais = await _db.AgendaDatas
            .Where(a => a.DentistaId == dentistaId && datas.Contains(a.Data))
            .ToListAsync(ct);

        foreach (var p in payload)
        {
            var a = atuais.FirstOrDefault(x => x.Data == p.data);
            var temManha = p.md.HasValue && p.ma.HasValue;
            var temTarde = p.td.HasValue && p.ta.HasValue;
            var temAlgo = temManha || temTarde || !string.IsNullOrWhiteSpace(p.obs);

            if (!temAlgo)
            {
                if (a is not null) _db.AgendaDatas.Remove(a);
                continue;
            }

            if (a is null)
            {
                a = new AgendaData
                {
                    DentistaId = dentistaId,
                    Data = p.data
                };
                _db.AgendaDatas.Add(a);
            }

            a.ManhaDe = p.md;
            a.ManhaAte = p.ma;
            a.TardeDe = p.td;
            a.TardeAte = p.ta;
            a.Observacao = p.obs;
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("/admin/agenda-datas/{dentistaId:guid}/{ano:int}-{mes:int}-{dia:int}")]
    public async Task<IActionResult> DeleteData(Guid dentistaId, int ano, int mes, int dia, CancellationToken ct)
    {
        if (dentistaId == Guid.Empty) return BadRequest("dentistaId obrigatório.");
        var d = new DateOnly(ano, mes, dia);

        await _db.AgendaDatas
            .Where(a => a.DentistaId == dentistaId && a.Data == d)
            .ExecuteDeleteAsync(ct);

        return NoContent();
    }


    [HttpGet("{id:guid}/retorno-sugestoes")]
    public async Task<ActionResult<List<RetornoSugestaoDto>>> GetSugestoesRetorno(
        [FromRoute] Guid id,
        [FromQuery] int[]? dias,
        CancellationToken ct)
    {
        var c = await _db.Consultas
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct); 

        if (c is null) return NotFound();

        var proc = await _db.Procedimentos.FindAsync(new object?[] { c.ProcedimentoId }, ct);
        dias ??= new[] { 7, 14, 30 };

        var list = new List<RetornoSugestaoDto>();

        foreach (var dd in dias.Distinct().OrderBy(x => x))
        {
            var dia = DateOnly.FromDateTime(c.Inicio.Date.AddDays(dd));
            var slots = await _slots.GerarSlotsAsync(dia, c.DentistaId, c.ProcedimentoId, ct);

            var exc = await _db.AgendaExcecoes.AsNoTracking()
                .Where(e => e.DentistaId == c.DentistaId && e.Data == dia)
                .Select(e => new { e.FechadoDiaTodo, e.AbrirManhaDe, e.AbrirManhaAte, e.AbrirTardeDe, e.AbrirTardeAte })
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
                        var md = exc.AbrirManhaDe ?? default; var ma = exc.AbrirManhaAte ?? default;
                        var td = exc.AbrirTardeDe ?? default; var ta = exc.AbrirTardeAte ?? default;

                        var filtrados = slots.Where(s =>
                        {
                            var t = TimeOnly.FromDateTime(DateTime.Parse(s.HoraISO, null,
                                System.Globalization.DateTimeStyles.RoundtripKind));
                            return (temManha && t >= md && t <= ma) || (temTarde && t >= td && t <= ta);
                        }).ToList();

                        slots = filtrados; 
                    }
                }
            }

            list.Add(new RetornoSugestaoDto(dia, slots.Select(s => s.HoraISO).ToList()));


        }

        return Ok(list);
    }

    [HttpPost("{id:guid}/retorno")]
    public async Task<ActionResult<Guid>> CriarRetorno(
        [FromRoute] Guid id,
        [FromBody] CriarRetornoDto dto,
        CancellationToken ct)
    {
        var origem = await _db.Consultas.FindAsync(new object?[] { id }, ct);
        if (origem is null) return NotFound();

        var pacienteId = origem.PacienteId;
        var dentistaId = dto.DentistaId == Guid.Empty ? origem.DentistaId : dto.DentistaId;
        var procedimentoId = dto.ProcedimentoId == Guid.Empty ? origem.ProcedimentoId : dto.ProcedimentoId;

        var proc = await _db.Procedimentos.FindAsync(new object?[] { procedimentoId }, ct)
                   ?? throw new InvalidOperationException("Procedimento inválido");

        var inicio = dto.Inicio;
        var fim = inicio.AddMinutes(proc.DuracaoMin + proc.BufferMin);

        var conflito = await _db.Consultas.AnyAsync(c =>
            c.DentistaId == dentistaId &&
            c.Status != ConsultaStatus.Cancelada &&
            !(fim <= c.Inicio || inicio >= c.Fim), ct);

        if (conflito) return Conflict("Horário indisponível.");

        var retorno = new Consulta
        {
            DentistaId = dentistaId,
            PacienteId = pacienteId,
            ProcedimentoId = procedimentoId,
            Inicio = inicio,
            Fim = fim,
            Status = ConsultaStatus.Agendada,
            IsRetorno = true,
            ConsultaOrigemId = origem.Id
        };

        _db.Consultas.Add(retorno);
        await _db.SaveChangesAsync(ct);

        return Ok(retorno.Id);
    }
}
