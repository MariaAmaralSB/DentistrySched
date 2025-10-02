
public sealed class AgendaDiaItemDto
{
    public Guid Id { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public int Status { get; set; }

    public Guid DentistaId { get; set; }
    public string DentistaNome { get; set; } = "";

    public Guid PacienteId { get; set; }
    public string PacienteNome { get; set; } = "";

    public Guid ProcedimentoId { get; set; }
    public string ProcedimentoNome { get; set; } = "";

    public string Hora => Inicio.ToString("HH:mm");
}
