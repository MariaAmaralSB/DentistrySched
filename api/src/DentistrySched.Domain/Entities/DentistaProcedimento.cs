using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;
public class DentistaProcedimento : ITenantEntity
{
    public Guid TenantId { get; set; }
    public Guid DentistaId { get; set; }
    public Dentista Dentista { get; set; } = null!;

    public Guid ProcedimentoId { get; set; }
    public Procedimento Procedimento { get; set; } = null!;
}