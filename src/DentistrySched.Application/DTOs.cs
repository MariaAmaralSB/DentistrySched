namespace DentistrySched.Application.DTOs;

public record CriarConsultaDto(
    Guid DentistaId,
    Guid ProcedimentoId,
    DateTime Inicio,
    string PacienteNome,
    string CelularWhatsApp,
    string? Email,
    string? Descricao,
    string[]? Sintomas
);

public record SlotDto(string HoraISO);
