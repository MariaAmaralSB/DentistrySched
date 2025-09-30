namespace DentistrySched.Domain.Entities;

public class Procedimento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public int DuracaoMin { get; set; }
    public int BufferMin { get; set; }
}
