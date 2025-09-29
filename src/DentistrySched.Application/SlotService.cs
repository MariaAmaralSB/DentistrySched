using DentistrySched.Application.DTOs;
using DentistrySched.Domain;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System;

namespace DentistrySched.Application;

public class SlotService : ISlotService
{
    private readonly AppDbContext _db;
    public SlotService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SlotDto>> GerarSlotsAsync(DateOnly dia, Guid dentistaId, Guid procedimentoId, CancellationToken ct)
    {
        var proc = await _db.Procedimentos.FindAsync(new object?[] { procedimentoId }, ct);
        if (proc is null) return Array.Empty<SlotDto>();

        var regra = await _db.AgendaRegras
            .FirstOrDefaultAsync(r => r.DentistaId == dentistaId && r.DiaSemana == dia.DayOfWeek, ct);
        if (regra is null) return Array.Empty<SlotDto>();

        var ocupados = await _db.Consultas
            .Where(c => c.DentistaId == dentistaId && DateOnly.FromDateTime(c.Inicio) == dia && c.Status != ConsultaStatus.Cancelada)
            .Select(c => new { c.Inicio, c.Fim })
            .ToListAsync(ct);

        var dur = TimeSpan.FromMinutes(proc.DuracaoMin + proc.BufferMin);
        var slots = new List<SlotDto>();

        IEnumerable<(TimeOnly, TimeOnly)> blocos()
        {
            yield return (regra.InicioManha, regra.FimManha);
            if (regra.InicioTarde.HasValue && regra.FimTarde.HasValue)
                yield return (regra.InicioTarde.Value, regra.FimTarde.Value);
        }

        foreach (var (ini, fim) in blocos())
        {
            var cursor = ini;
            while (cursor.Add(dur) <= fim)
            {
                var inicioDt = dia.ToDateTime(cursor);
                var fimDt = inicioDt.Add(dur);
                var conflito = ocupados.Any(o => !(fimDt <= o.Inicio || inicioDt >= o.Fim));
                if (!conflito) slots.Add(new SlotDto(inicioDt.ToString("O")));
                cursor = cursor.AddMinutes(proc.DuracaoMin + proc.BufferMin);
            }
        }

        return slots;
    }
}
