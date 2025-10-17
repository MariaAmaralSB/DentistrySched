using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class AgendaExcecaoConfig : IEntityTypeConfiguration<AgendaExcecao>
{
    public void Configure(EntityTypeBuilder<AgendaExcecao> b)
    {
        b.Property(x => x.Data).HasColumnType("date");
        b.Property(x => x.AbrirManhaDe).HasColumnType("time");
        b.Property(x => x.AbrirManhaAte).HasColumnType("time");
        b.Property(x => x.AbrirTardeDe).HasColumnType("time");
        b.Property(x => x.AbrirTardeAte).HasColumnType("time");

        b.HasIndex(x => new { x.DentistaId, x.Data }).IsUnique();
    }
}
