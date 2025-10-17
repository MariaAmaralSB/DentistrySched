namespace DentistrySched.Domain.Entities;
public class DentistaProcedimento
{
    public Guid DentistaId { get; set; }
    public Dentista Dentista { get; set; } = null!;

    public Guid ProcedimentoId { get; set; }
    public Procedimento Procedimento { get; set; } = null!;
}