using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class PacienteConfig : IEntityTypeConfiguration<Paciente>
{
    public void Configure(EntityTypeBuilder<Paciente> b)
    {
        b.Property(p => p.Nome).HasMaxLength(120).IsRequired();
        b.Property(p => p.CelularWhatsApp).HasMaxLength(30).IsRequired();
    }
}
