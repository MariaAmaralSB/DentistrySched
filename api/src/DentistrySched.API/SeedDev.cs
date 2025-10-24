using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using DentistrySched.Application.Services.Security;

namespace DentistrySched.API;

public static class SeedDev
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (!db.Dentistas.Any())
        {
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

            db.DentistasProcedimentos.Add(new DentistaProcedimento { DentistaId = dentista.Id, ProcedimentoId = proc1.Id });
            db.DentistasProcedimentos.Add(new DentistaProcedimento { DentistaId = dentista.Id, ProcedimentoId = proc2.Id });

            await db.SaveChangesAsync();
        }

        // ======= Perfis (roles) =======
        string[] baseRoles = { "Admin", "Dentista", "Recepcao" };
        foreach (var r in baseRoles)
        {
            if (!db.Roles.Any(x => x.Name == r))
                db.Roles.Add(new Role { Name = r, Description = $"Papel {r}" });
        }
        await db.SaveChangesAsync();

        var hasher = new PasswordHasher();

        // ======= Usuário Admin =======
        var adminEmail = "admin@clinic.local";
        if (!db.Users.Any(u => u.Email == adminEmail))
        {
            var admin = new User
            {
                Name = "Administrador",
                Email = adminEmail,
                PasswordHash = hasher.Hash("Admin@123"),
                IsActive = true
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();

            var adminRoleId = db.Roles.First(r => r.Name == "Admin").Id;
            if (!db.UserRoles.Any(ur => ur.UserId == admin.Id && ur.RoleId == adminRoleId))
            {
                db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRoleId });
                await db.SaveChangesAsync();
            }
        }

        var ana = db.Dentistas.FirstOrDefault(d => d.Nome == "Dra. Ana");
        if (ana is not null)
        {
            var anaEmail = "ana@clinic.local";
            if (!db.Users.Any(u => u.Email == anaEmail))
            {
                var u = new User
                {
                    Name = "Dra. Ana",
                    Email = anaEmail,
                    PasswordHash = hasher.Hash("Dentista@123"),
                    IsActive = true,
                    DentistaId = ana.Id
                };
                db.Users.Add(u);
                await db.SaveChangesAsync();

                var roleId = db.Roles.First(r => r.Name == "Dentista").Id;
                if (!db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == roleId))
                {
                    db.UserRoles.Add(new UserRole { UserId = u.Id, RoleId = roleId });
                    await db.SaveChangesAsync();
                }
            }
        }
    }
}
