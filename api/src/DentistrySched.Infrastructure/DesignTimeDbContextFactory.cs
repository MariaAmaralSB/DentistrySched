using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using DentistrySched.Infrastructure.Tenancy;

namespace DentistrySched.Infrastructure;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("PG_CONN")
                 ?? "Host=localhost;Port=5432;Database=dentistry;Username=postgres;Password=postgres";

        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseNpgsql(cs, npgsql =>
        {
            npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
        });

        var tenant = new DesignTimeTenantProvider(); 
        return new AppDbContext(builder.Options, tenant);
    }
}
