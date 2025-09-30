namespace DentistrySched.Domain.Entities;

public class Dentista
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string? CRO { get; set; }
}
