using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class DentistaConfig : IEntityTypeConfiguration<Dentista>
{
    public void Configure(EntityTypeBuilder<Dentista> b)
    {
        b.Property(p => p.Nome).HasMaxLength(120).IsRequired();
    }
}
