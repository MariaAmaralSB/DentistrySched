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
        await db.Database.MigrateAsync();

        if (!await db.Procedimentos.AnyAsync())
        {
            db.Procedimentos.Add(new Procedimento
            {
                Nome = "Consulta",
                DuracaoMin = 30   // <-- nome correto
            });

            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] Erro aplicando migrations/seed: {ex}");
        throw; // deixe falhar se der problema; fica visível no log do Render
    }
}

app.MapControllers();
app.Run();
