using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class AgendaData : BaseTenantEntity
{
    public Guid DentistaId { get; set; }
    public DateOnly Data { get; set; }

    public TimeOnly? ManhaDe { get; set; }
    public TimeOnly? ManhaAte { get; set; }
    public TimeOnly? TardeDe { get; set; }
    public TimeOnly? TardeAte { get; set; }

    public string? Observacao { get; set; }
}
