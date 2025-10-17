using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configuration;

public class DentistaProcedimentoConfig : IEntityTypeConfiguration<DentistaProcedimento>
{
    public void Configure(EntityTypeBuilder<DentistaProcedimento> b)
    {
        b.ToTable("DentistaProcedimento");

        b.HasKey(x => new { x.TenantId, x.DentistaId, x.ProcedimentoId });

        b.HasOne(x => x.Dentista)
         .WithMany(d => d.DentistaProcedimentos)
         .HasForeignKey(x => new { x.TenantId, x.DentistaId })
         .HasPrincipalKey(d => new { d.TenantId, d.Id })
         .OnDelete(DeleteBehavior.Cascade);

        b.HasOne(x => x.Procedimento)
         .WithMany()
         .HasForeignKey(x => new { x.TenantId, x.ProcedimentoId })
         .HasPrincipalKey(p => new { p.TenantId, p.Id })
         .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => new { x.TenantId, x.ProcedimentoId });
    }
}

