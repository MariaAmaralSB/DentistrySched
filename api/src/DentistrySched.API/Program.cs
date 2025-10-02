using DentistrySched.API;
using DentistrySched.API.Services;
using DentistrySched.Application.Interface;
using DentistrySched.Application.Services;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default")!;
    opt.UseSqlite(cs);
});

builder.Services.AddScoped<ISlotService, SlotService>();
builder.Services.AddHostedService<ConsultaReminderService>();
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        // 1) Migra o banco
        var pending = await db.Database.GetPendingMigrationsAsync();
        if (pending.Any())
            Console.WriteLine($"[DB] Pending migrations: {string.Join(", ", pending)}");
        await db.Database.MigrateAsync();

        // 2) Seed mínimo (seguro — não depende de propriedade específica)
        if (!await db.Procedimentos.AnyAsync())
        {
            db.Procedimentos.Add(new Procedimento { Nome = "Consulta" });
            await db.SaveChangesAsync();
            Console.WriteLine("[DB] Seed de Procedimentos aplicado.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB] Erro ao migrar/seedar: " + ex);
    }
}


app.MapControllers();
app.Run();
