using DentistrySched.Domain.Common;
using DentistrySched.Domain.Enums;

namespace DentistrySched.Domain.Entities;

public class Consulta : BaseTenantEntity
{
    public Guid DentistaId { get; set; }
    public Guid PacienteId { get; set; }
    public Guid ProcedimentoId { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public ConsultaStatus Status { get; set; } = ConsultaStatus.Agendada;

    public PreTriagem? PreTriagem { get; set; }
    public Dentista? Dentista { get; set; }
    public Paciente? Paciente { get; set; }
    public Procedimento? Procedimento { get; set; }
}
