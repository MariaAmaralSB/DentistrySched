namespace DentistrySched.Application.DTO;

public record AgendaSemanaDiaDto(
    DateOnly Dia,
    int Livres,
    int Ocupados,
    string? PrimeiroLivre 
);
