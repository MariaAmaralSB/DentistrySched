namespace DentistrySched.Domain.Entities;

public class Procedimento
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = "";
    public int DuracaoMin { get; set; }
    public int BufferMin { get; set; }

    public ICollection<DentistaProcedimento> Dentistas { get; set; }
        = new HashSet<DentistaProcedimento>();
}
