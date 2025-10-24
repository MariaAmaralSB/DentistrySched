using DentistrySched.API;
using DentistrySched.API.Services;
using DentistrySched.Application.Interface;
using DentistrySched.Application.Services;
using DentistrySched.Application.Services.Security;
using DentistrySched.Infrastructure;
using DentistrySched.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- MVC / Swagger ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- Multi-tenant: provider + http context ---
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider>(sp =>
{
    var accessor = sp.GetRequiredService<IHttpContextAccessor>();
    if (accessor.HttpContext is not null)
        return new TenantProvider(accessor);  
    return new DesignTimeTenantProvider();     
});

// --- EF Core / Npgsql  ---
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default")
             ?? "Host=localhost;Port=5432;Database=dentistry;Username=postgres;Password=postgres";

    AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

    opt.UseNpgsql(cs);
#if DEBUG
    opt.EnableDetailedErrors();
    opt.EnableSensitiveDataLogging();
#endif
});

// --- CORS ---
builder.Services.AddCors(opt =>
{
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

// --- App services ---
builder.Services.AddScoped<ISlotService, SlotService>();
builder.Services.AddHostedService<ConsultaReminderService>();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<JwtTokenService>();

// --- Autentica��o JWT Bearer ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var keyStr = jwtSection["Key"];
if (string.IsNullOrWhiteSpace(keyStr))
    throw new InvalidOperationException("Jwt:Key ausente no appsettings.");

var key = Encoding.UTF8.GetBytes(keyStr!);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new()
        {
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// --- Swagger / CORS ---
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();

// --------- Middleware de Tenant ---------
app.Use(async (ctx, next) =>
{
    var tenantProvider = ctx.RequestServices.GetRequiredService<ITenantProvider>();

    if (ctx.Request.Headers.TryGetValue("X-Tenant-Id", out var values) &&
        Guid.TryParse(values.FirstOrDefault(), out var headerTenant))
    {
        tenantProvider.TenantId = headerTenant;
    }
    else
    {
        var cfg = ctx.RequestServices.GetRequiredService<IConfiguration>();
        if (Guid.TryParse(cfg["Tenants:Default"], out var defaultTenant))
            tenantProvider.TenantId = defaultTenant;
    }

    await next();
});

// --- Auth (antes dos endpoints) ---
app.UseAuthentication();
app.UseAuthorization();

// --------- Seed por tenant  ----------
using (var scope = app.Services.CreateScope())
{
    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    var cs = cfg.GetConnectionString("Default")
             ?? "Host=localhost;Port=5432;Database=dentistry;Username=postgres;Password=postgres";

    AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

    var optBuilder = new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql(cs);

    var seeds = new List<Guid>();
    if (Guid.TryParse(cfg["Tenants:Default"], out var defTid)) seeds.Add(defTid);
    var extras = cfg.GetSection("Tenants:Extras").Get<string[]>() ?? Array.Empty<string>();
    foreach (var s in extras) if (Guid.TryParse(s, out var g)) seeds.Add(g);
    if (seeds.Count == 0) seeds.Add(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));

    foreach (var tid in seeds.Distinct())
    {
        var designTenant = new DesignTimeTenantProvider(tid);
        using var db = new AppDbContext(optBuilder.Options, designTenant);

        await db.Database.EnsureCreatedAsync();

        await SeedDev.RunAsync(db);
    }
}

app.MapControllers();
app.Run();
