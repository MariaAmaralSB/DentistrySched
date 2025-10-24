using DentistrySched.Domain.Common;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.Infrastructure;

public class AppDbContext : DbContext
{
    private readonly ITenantProvider _tenant;
    private Guid CurrentTenantId => _tenant.TenantId;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantProvider tenant)
        : base(options) => _tenant = tenant;

    public DbSet<Dentista> Dentistas => Set<Dentista>();
    public DbSet<Procedimento> Procedimentos => Set<Procedimento>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<AgendaRegra> AgendaRegras => Set<AgendaRegra>();
    public DbSet<AgendaExcecao> AgendaExcecoes => Set<AgendaExcecao>();
    public DbSet<AgendaData> AgendaDatas => Set<AgendaData>();
    public DbSet<DentistaProcedimento> DentistasProcedimentos => Set<DentistaProcedimento>();

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        mb.Entity<Dentista>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<Procedimento>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<Paciente>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<Consulta>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<AgendaRegra>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<AgendaExcecao>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<AgendaData>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<DentistaProcedimento>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        mb.Entity<User>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<Role>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        mb.Entity<UserRole>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        mb.Entity<User>()
            .HasIndex(u => new { u.Email, u.TenantId })
            .IsUnique();

        mb.Entity<Role>()
            .HasIndex(r => new { r.Name, r.TenantId })
            .IsUnique();

        mb.Entity<User>()
            .HasMany(u => u.Roles)
            .WithOne(ur => ur.User)
            .HasForeignKey(ur => ur.UserId);

        mb.Entity<Role>()
            .HasMany(r => r.Users)
            .WithOne(ur => ur.Role)
            .HasForeignKey(ur => ur.RoleId);

        mb.Entity<User>()
            .HasOne(u => u.Dentista)
            .WithMany() 
            .HasForeignKey(u => u.DentistaId)
            .IsRequired(false);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var e in ChangeTracker.Entries().Where(e => e.State == EntityState.Added))
        {
            if (e.Entity is ITenantEntity te && te.TenantId == Guid.Empty)
                te.TenantId = _tenant.TenantId;
        }
        return base.SaveChangesAsync(ct);
    }
}
