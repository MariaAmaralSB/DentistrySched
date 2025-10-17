namespace DentistrySched.Domain.Entities;

public class Dentista
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = "";
    public string? CRO { get; set; }

    public ICollection<DentistaProcedimento> DentistaProcedimentos { get; set; }
        = new HashSet<DentistaProcedimento>();
}