using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class AgendaRegra : BaseTenantEntity
{
    public Guid DentistaId { get; set; }
    public DayOfWeek DiaSemana { get; set; }
    public TimeOnly InicioManha { get; set; }
    public TimeOnly FimManha { get; set; }
    public TimeOnly? InicioTarde { get; set; }
    public TimeOnly? FimTarde { get; set; }
}
