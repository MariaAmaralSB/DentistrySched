// Program.cs
using DentistrySched.API;
using DentistrySched.API.Services;
using DentistrySched.Application.Interface;
using DentistrySched.Application.Services;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContextPool<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default")!;
    opt.UseSqlite(cs);
});

builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddScoped<ISlotService, SlotService>();
builder.Services.AddHostedService<ConsultaReminderService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        var created = await db.Database.EnsureCreatedAsync();
        logger.LogInformation("[DB] EnsureCreated => {created}", created);

        if (!await db.Procedimentos.AsNoTracking().AnyAsync())
        {
            db.Procedimentos.Add(new Procedimento { Nome = "Consulta" });
            await db.SaveChangesAsync();
            logger.LogInformation("[DB] Seed inserted (Procedimentos).");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[DB] ERROR on startup");
        throw;
    }
}

app.MapControllers();
app.Run();
