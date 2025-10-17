using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class Paciente : BaseTenantEntity
{
    public string Nome { get; set; } = string.Empty;
    public string CelularWhatsApp { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool ConsentimentoWhatsApp { get; set; } = true;
}
