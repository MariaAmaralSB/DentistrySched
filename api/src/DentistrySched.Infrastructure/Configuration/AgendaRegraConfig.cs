using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class AgendaRegraConfig : IEntityTypeConfiguration<AgendaRegra>
{
    public void Configure(EntityTypeBuilder<AgendaRegra> b)
    {
        b.Property(x => x.InicioManha).HasColumnType("time");
        b.Property(x => x.FimManha).HasColumnType("time");
        b.Property(x => x.InicioTarde).HasColumnType("time");
        b.Property(x => x.FimTarde).HasColumnType("time");
    }
}
    