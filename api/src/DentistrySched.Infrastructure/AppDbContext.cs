using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DentistrySched.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Dentista> Dentistas => Set<Dentista>();
    public DbSet<Procedimento> Procedimentos => Set<Procedimento>();
    public DbSet<AgendaRegra> AgendaRegras => Set<AgendaRegra>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Consulta> Consultas => Set<Consulta>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Dentista>()
            .Property(p => p.Nome)
            .HasMaxLength(120)
            .IsRequired();

        mb.Entity<Paciente>()
            .Property(p => p.Nome)
            .HasMaxLength(120)
            .IsRequired();

        mb.Entity<Paciente>()
            .Property(p => p.CelularWhatsApp)
            .HasMaxLength(30)
            .IsRequired();

        mb.Entity<Procedimento>()
            .Property(p => p.Nome)
            .HasMaxLength(120)
            .IsRequired();

        mb.Entity<Consulta>()
            .HasIndex(c => new { c.DentistaId, c.Inicio, c.Fim })
            .IsUnique();

        mb.Entity<Consulta>().OwnsOne(c => c.PreTriagem, ow =>
        {
            ow.Property(x => x.Descricao);

            ow.Property(x => x.Sintomas)
              .HasConversion(
                  v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                  v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions)null) ?? Array.Empty<string>()
              );
        });

        base.OnModelCreating(mb);
    }
}
