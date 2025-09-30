namespace DentistrySched.Domain.Entities;

public class PreTriagem
{
    public string? Descricao { get; set; }
    public string[] Sintomas { get; set; } = Array.Empty<string>();
}
