using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class Procedimento : BaseTenantEntity
{
    public string Nome { get; set; } = "";
    public int DuracaoMin { get; set; }
    public int BufferMin { get; set; }
    public int? RetornoEmDias { get; set; } 

    public ICollection<DentistaProcedimento> Dentistas { get; set; }
        = new HashSet<DentistaProcedimento>();
}
