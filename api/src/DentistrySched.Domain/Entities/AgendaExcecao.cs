namespace DentistrySched.Domain.Entities;

public class AgendaExcecao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DentistaId { get; set; }
    public DateOnly Data { get; set; }

    public bool FechadoDiaTodo { get; set; }

    public TimeOnly? AbrirManhaDe { get; set; }
    public TimeOnly? AbrirManhaAte { get; set; }
    public TimeOnly? AbrirTardeDe { get; set; }
    public TimeOnly? AbrirTardeAte { get; set; }

    public string? Motivo { get; set; }
}
