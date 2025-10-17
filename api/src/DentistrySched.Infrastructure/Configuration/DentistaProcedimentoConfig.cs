using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class DentistaProcedimentoConfig : IEntityTypeConfiguration<DentistaProcedimento>
{
    public void Configure(EntityTypeBuilder<DentistaProcedimento> cfg)
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
    }
}
