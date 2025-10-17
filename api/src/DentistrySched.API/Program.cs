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

builder.Services.AddDbContextPool<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default")
             ?? "Host=localhost;Port=5432;Database=dentistry;Username=postgres;Password=postgres";

    AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

    opt.UseNpgsql(cs);
    opt.EnableDetailedErrors();
    opt.EnableSensitiveDataLogging();
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
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.EnsureCreatedAsync();

    if (!await db.Procedimentos.AsNoTracking().AnyAsync())
    {
        db.Procedimentos.Add(new Procedimento
        {
            Nome = "Consulta",
            DuracaoMin = 40,
            BufferMin = 10
        });
        await db.SaveChangesAsync();
    }
}

app.MapControllers();
app.Run();
