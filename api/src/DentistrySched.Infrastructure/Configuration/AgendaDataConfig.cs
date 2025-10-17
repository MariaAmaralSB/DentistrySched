using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DentistrySched.Infrastructure.Configurations;

public class AgendaDataConfig : IEntityTypeConfiguration<AgendaData>
{
    public void Configure(EntityTypeBuilder<AgendaData> b)
    {
        b.Property(x => x.Data).HasColumnType("date");
        b.Property(x => x.ManhaDe).HasColumnType("time");
        b.Property(x => x.ManhaAte).HasColumnType("time");
        b.Property(x => x.TardeDe).HasColumnType("time");
        b.Property(x => x.TardeAte).HasColumnType("time");

        b.HasIndex(x => new { x.DentistaId, x.Data }).IsUnique();
    }
}
