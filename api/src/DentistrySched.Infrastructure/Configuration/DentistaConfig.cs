using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class DentistaConfig : IEntityTypeConfiguration<Dentista>
{
    public void Configure(EntityTypeBuilder<Dentista> b)
    {
        b.ToTable("Dentistas");
        b.HasKey(x => x.Id);

        b.Property(x => x.Nome).HasMaxLength(120).IsRequired();

        b.HasAlternateKey(x => new { x.TenantId, x.Id })
         .HasName("AK_Dentistas_TenantId_Id");
    }
}

