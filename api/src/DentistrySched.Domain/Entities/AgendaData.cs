using System.ComponentModel.DataAnnotations;

namespace DentistrySched.Domain.Entities;

public class AgendaData
{
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DentistaId { get; set; }
    public DateOnly Data { get; set; }

    // janelas (opcionais)
    public TimeOnly? ManhaDe { get; set; }
    public TimeOnly? ManhaAte { get; set; }
    public TimeOnly? TardeDe { get; set; }
    public TimeOnly? TardeAte { get; set; }

    public string? Observacao { get; set; }
}
