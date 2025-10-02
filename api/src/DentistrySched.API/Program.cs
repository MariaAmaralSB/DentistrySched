using DentistrySched.API;
using DentistrySched.API.Services;
using DentistrySched.Application.Interface;
using DentistrySched.Application.Services;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// Controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext (migrations ficam no assembly da Infra)
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default")!;
    opt.UseSqlite(cs, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName));
});

// CORS (apenas UMA vez)
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

// APP services
builder.Services.AddScoped<ISlotService, SlotService>();

// Hosted service (pode ficar, mas ele tem um delay interno para não bater antes das tabelas)
// Se quiser testar sem ele, comente esta linha temporariamente.
builder.Services.AddHostedService<ConsultaReminderService>();

var app = builder.Build();

// Middlewares
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();

// ==== MIGRATE & SEED ANTES DE SUBIR A API ====
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        var cs = app.Configuration.GetConnectionString("Default");
        logger.LogInformation("[DB] ConnectionString: {cs}", cs);

        var applied = await db.Database.GetAppliedMigrationsAsync();
        var pending = await db.Database.GetPendingMigrationsAsync();

        logger.LogInformation("[DB] Applied: {applied}", string.Join(", ", applied));
        logger.LogInformation("[DB] Pending: {pending}", string.Join(", ", pending));

        if (pending.Any() || !applied.Any())
        {
            logger.LogInformation("[DB] Running MigrateAsync()...");
            await db.Database.MigrateAsync();
        }

        applied = await db.Database.GetAppliedMigrationsAsync();
        if (!applied.Any())
        {
            // Só usa EnsureCreated se REALMENTE não há migrations.
            logger.LogWarning("[DB] No applied migrations, calling EnsureCreatedAsync()...");
            await db.Database.EnsureCreatedAsync();
        }

        // Seed mínimo (ajuste o nome da propriedade conforme seu domínio)
        if (!await db.Procedimentos.AnyAsync())
        {
            db.Procedimentos.Add(new Procedimento
            {
                Nome = "Consulta",
                // Se sua entidade usa DuracaoEmMinutos, descomente:
                // DuracaoEmMinutos = 30
            });
            await db.SaveChangesAsync();
            logger.LogInformation("[DB] Seed inserted (Procedimentos).");
        }

        logger.LogInformation("[DB] Startup DB init done.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[DB] ERROR on startup");
        throw; // falhe se não conseguir criar as tabelas
    }
}
// ============================================

app.MapControllers();
app.Run();
