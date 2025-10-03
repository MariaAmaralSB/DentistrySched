using DentistrySched.Application.DTO;
using DentistrySched.Application.Interface;
using DentistrySched.Domain.Entities;
using DentistrySched.Domain.Enums;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.Application.Services;

public class SlotService : ISlotService
{
    private readonly AppDbContext _db;
    public SlotService(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SlotDto>> GerarSlotsAsync(
        DateOnly dia, Guid dentistaId, Guid procedimentoId, CancellationToken ct)
    {
        // ---------- 0) Dados base (sempre no-tracking + projeção mínima)
        var proc = await _db.Procedimentos
            .AsNoTracking()
            .Where(p => p.Id == procedimentoId)
            .Select(p => new { p.DuracaoMin, p.BufferMin })
            .FirstOrDefaultAsync(ct);

        if (proc is null) return Array.Empty<SlotDto>();

        // Se não há regra para o dia da semana, não abre agenda
        var dow = dia.DayOfWeek; // DayOfWeek

        var regra = await _db.AgendaRegras
            .AsNoTracking()
            .Where(r => r.DentistaId == dentistaId && r.DiaSemana == dow)
            .Select(r => new
            {
                r.InicioManha,
                r.FimManha,
                r.InicioTarde,
                r.FimTarde
            })
            .FirstOrDefaultAsync(ct);

        if (regra is null) return Array.Empty<SlotDto>();

        // ---------- 1) Consultas ocupadas do dia (faixa de data)
        var dayStart = dia.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);

        var ocupados = await _db.Consultas
            .AsNoTracking()
            .Where(c => c.DentistaId == dentistaId
                        && c.Status != ConsultaStatus.Cancelada
                        && c.Inicio >= dayStart && c.Inicio < dayEnd)
            .OrderBy(c => c.Inicio)
            .Select(c => new { c.Inicio, c.Fim })
            .ToListAsync(ct);

        // ---------- 2) Parâmetros e guardas
        var passoMin = proc.DuracaoMin + proc.BufferMin;
        if (passoMin <= 0)
        {
            // Evita loop infinito e comportamento inesperado
            return Array.Empty<SlotDto>();
        }

        var passo = TimeSpan.FromMinutes(passoMin);

        // ---------- 3) Geração linear de slots com varredura de conflitos
        var result = new List<SlotDto>(capacity: 128);

        void GerarBloco(TimeOnly inicio, TimeOnly fim)
        {
            if (fim <= inicio) return;

            var cursor = inicio;
            int idx = 0; // ponteiro nos ocupados (já estão ordenados por Inicio)

            while (cursor.Add(passo) <= fim)
            {
                var slotStart = dia.ToDateTime(cursor);
                var slotEnd = slotStart.Add(passo);

                // avança ponteiro enquanto o ocupado termina antes do slot começar
                while (idx < ocupados.Count && ocupados[idx].Fim <= slotStart)
                    idx++;

                bool conflita = false;
                if (idx < ocupados.Count)
                {
                    // se o ocupado atual começa antes do fim do slot, há conflito
                    conflita = !(slotEnd <= ocupados[idx].Inicio || slotStart >= ocupados[idx].Fim);
                    // (não precisamos olhar os próximos ocupados, pois estão ordenados)
                }

                if (!conflita)
                    result.Add(new SlotDto(slotStart.ToString("O")));

                cursor = cursor.AddMinutes(passoMin);
            }
        }

        // Manhã
        if (regra.InicioManha != default || regra.FimManha != default)
        {
            // Quando você grava default em vez de null para manhã, faça a guarda assim
            var mIni = regra.InicioManha;
            var mFim = regra.FimManha;
            if (mFim > mIni) GerarBloco(mIni, mFim);
        }

        // Tarde
        if (regra.InicioTarde.HasValue && regra.FimTarde.HasValue && regra.FimTarde > regra.InicioTarde)
        {
            GerarBloco(regra.InicioTarde.Value, regra.FimTarde.Value);
        }

        return result;
    }
}
