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
    opt.UseSqlite(cs, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
});

builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
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
        var cs = app.Configuration.GetConnectionString("Default");
        Console.WriteLine($"[DB] ConnectionString: {cs}");

        var pending = await db.Database.GetPendingMigrationsAsync();
        var applied = await db.Database.GetAppliedMigrationsAsync();

        Console.WriteLine($"[DB] Applied: {string.Join(", ", applied)}");
        Console.WriteLine($"[DB] Pending: {string.Join(", ", pending)}");

        if (pending.Any() || !applied.Any())
        {
            Console.WriteLine("[DB] Running MigrateAsync()...");
            await db.Database.MigrateAsync();
        }

        // fallback: se por qualquer motivo não tiver migration aplicada, assegura o schema
        applied = await db.Database.GetAppliedMigrationsAsync();
        if (!applied.Any())
        {
            Console.WriteLine("[DB] No applied migrations, calling EnsureCreatedAsync()...");
            await db.Database.EnsureCreatedAsync();
        }

        // Seed mínimo
        if (!await db.Procedimentos.AnyAsync())
        {
            db.Procedimentos.Add(new Procedimento { Nome = "Consulta" }); // use só o que existe na entidade
            await db.SaveChangesAsync();
            Console.WriteLine("[DB] Seed inserted (Procedimentos).");
        }

        Console.WriteLine("[DB] Startup DB init done.");
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB] ERROR on startup: " + ex);
    }
}


app.MapControllers();
app.Run();
