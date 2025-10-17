using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class ProcedimentoConfig : IEntityTypeConfiguration<Procedimento>
{
    public void Configure(EntityTypeBuilder<Procedimento> b)
    {
        b.ToTable("Procedimentos");
        b.HasKey(x => x.Id);

        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();

        b.HasAlternateKey(x => new { x.TenantId, x.Id })
         .HasName("AK_Procedimentos_TenantId_Id");
    }
}

