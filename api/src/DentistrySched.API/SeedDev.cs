using DentistrySched.Domain;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;

namespace DentistrySched.API;

public static class SeedDev
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (db.Dentistas.Any()) return;

        var dentista = new Dentista { Nome = "Dra. Ana" };
        var proc1 = new Procedimento { Nome = "Limpeza", DuracaoMin = 40, BufferMin = 10 };
        var proc2 = new Procedimento { Nome = "Canal", DuracaoMin = 90, BufferMin = 15 };

        db.Dentistas.Add(dentista);
        db.Procedimentos.AddRange(proc1, proc2);

        db.AgendaRegras.Add(new AgendaRegra
        {
            DentistaId = dentista.Id,
            DiaSemana = DayOfWeek.Monday,
            InicioManha = new TimeOnly(8, 0),
            FimManha = new TimeOnly(12, 0),
            InicioTarde = new TimeOnly(14, 0),
            FimTarde = new TimeOnly(18, 0)
        });

        await db.SaveChangesAsync();
    }
}
