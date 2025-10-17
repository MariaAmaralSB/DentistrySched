using DentistrySched.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Text.Json;

namespace DentistrySched.Infrastructure.Configurations;

public class ConsultaConfig : IEntityTypeConfiguration<Consulta>
{
    public void Configure(EntityTypeBuilder<Consulta> b)
    {
        b.HasIndex(c => new { c.DentistaId, c.Inicio, c.Fim }).IsUnique();

        var sintomasComparer = new ValueComparer<string[]>(
            (a, b) => (a ?? Array.Empty<string>()).SequenceEqual(b ?? Array.Empty<string>()),
            a => (a ?? Array.Empty<string>())
                    .Aggregate(0, (acc, v) => HashCode.Combine(acc, v == null ? 0 : v.GetHashCode())),
            a => (a ?? Array.Empty<string>()).ToArray()
        );


        b.OwnsOne(c => c.PreTriagem, ow =>
        {
            ow.Property(x => x.Descricao);

            ow.Property(x => x.Sintomas)
              .HasConversion(
                  v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                  v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<string>()
              )
              .HasColumnType("jsonb")
              .Metadata.SetValueComparer(sintomasComparer);
        });
    }
}
