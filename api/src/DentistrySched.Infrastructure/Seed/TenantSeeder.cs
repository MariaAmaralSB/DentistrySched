using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.Infrastructure.Seed;

public static class TenantSeeder
{
    public static async Task SeedTenantAsync(AppDbContext db, Guid tenantId)
    {
        if (!await db.Procedimentos.AnyAsync(p => p.TenantId == tenantId))
        {
            db.Procedimentos.AddRange(
                new Procedimento { TenantId = tenantId, Nome = "Consulta", DuracaoMin = 40, BufferMin = 10 },
                new Procedimento { TenantId = tenantId, Nome = "Retorno", DuracaoMin = 20, BufferMin = 10 }
            );
        }

        if (!await db.Dentistas.AnyAsync(d => d.TenantId == tenantId))
        {
            db.Dentistas.Add(new Dentista { TenantId = tenantId, Nome = "Dra Demo", CRO = "0000" });
        }

        await db.SaveChangesAsync();
    }
}
