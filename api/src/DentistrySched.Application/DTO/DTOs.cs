namespace DentistrySched.Application.DTO;

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
public record AgendaRegraUpsertDto(
    DayOfWeek DiaSemana,
    string? InicioManha,
    string? FimManha,
    string? InicioTarde,
    string? FimTarde
); 
public record SlotDto(string HoraISO);
public record ConfirmarConsultaDto(DateTime? ConfirmadoEm = null);
public record CancelarConsultaDto(string? Motivo = null);
public record RemarcarConsultaDto(DateTime NovoInicio);
public record DentistaUpsertDto(string Nome, string? CRO);

