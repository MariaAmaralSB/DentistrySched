using DentistrySched.Domain.Enums;

namespace DentistrySched.Domain.Entities;

public class Consulta
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DentistaId { get; set; }
    public Guid PacienteId { get; set; }
    public Guid ProcedimentoId { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public ConsultaStatus Status { get; set; } = ConsultaStatus.Agendada;

    public PreTriagem? PreTriagem { get; set; }
}
