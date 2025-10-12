using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;  
using System.Text.Json;

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

        var sintomasComparer = new ValueComparer<string[]>(
            (a, b) => (a ?? Array.Empty<string>())
                .SequenceEqual(b ?? Array.Empty<string>()),

            a => (a ?? Array.Empty<string>())
                .Aggregate(0, (acc, v) => HashCode.Combine(acc, (v == null ? 0 : v.GetHashCode()))),

            a => (a ?? Array.Empty<string>()).ToArray()
        );

        mb.Entity<Consulta>().OwnsOne(c => c.PreTriagem, ow =>
        {
            ow.Property(x => x.Descricao);

            ow.Property(x => x.Sintomas)
              .HasConversion(
                  v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                  v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions)null) ?? Array.Empty<string>()
              )
              .Metadata.SetValueComparer(sintomasComparer);
        });

        mb.Entity<AgendaExcecao>()
          .HasIndex(x => new { x.DentistaId, x.Data })
          .IsUnique();

        mb.Entity<AgendaData>()
          .HasIndex(x => new { x.DentistaId, x.Data })
          .IsUnique();

        mb.Entity<DentistaProcedimento>(cfg =>
        {
            cfg.ToTable("DentistaProcedimento"); 
            cfg.HasKey(x => new { x.DentistaId, x.ProcedimentoId });

            cfg.HasOne(x => x.Dentista)
               .WithMany(d => d.DentistaProcedimentos)
               .HasForeignKey(x => x.DentistaId)
               .OnDelete(DeleteBehavior.Cascade);

            cfg.HasOne(x => x.Procedimento)
               .WithMany() 
               .HasForeignKey(x => x.ProcedimentoId)
               .OnDelete(DeleteBehavior.Cascade);

            cfg.HasIndex(x => x.ProcedimentoId);
        });

        base.OnModelCreating(mb);
    }
}
