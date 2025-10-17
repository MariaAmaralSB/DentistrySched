using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace DentistrySched.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Dentista> Dentistas => Set<Dentista>();
    public DbSet<Procedimento> Procedimentos => Set<Procedimento>();
    public DbSet<DentistaProcedimento> DentistasProcedimentos => Set<DentistaProcedimento>();

    public DbSet<AgendaRegra> AgendaRegras => Set<AgendaRegra>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<AgendaExcecao> AgendaExcecoes => Set<AgendaExcecao>();
    public DbSet<AgendaData> AgendaDatas => Set<AgendaData>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}
