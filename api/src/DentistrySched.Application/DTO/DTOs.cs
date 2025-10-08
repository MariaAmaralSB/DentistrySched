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
public class AgendaRegraUpsertDto
{
    public int DiaSemana { get; set; } 
    public string? InicioManha { get; set; }
    public string? FimManha { get; set; }
    public string? InicioTarde { get; set; }
    public string? FimTarde { get; set; }
}
public record SlotDto(string HoraISO);
public record ConfirmarConsultaDto(DateTime? ConfirmadoEm = null);
public record CancelarConsultaDto(string? Motivo = null);
public record RemarcarConsultaDto(DateTime NovoInicio);
public record DentistaUpsertDto(string Nome, string? CRO);
public record AgendaDataUpsertDto(
    DateOnly Data,
    string? ManhaDe,
    string? ManhaAte,
    string? TardeDe,
    string? TardeAte,
    string? Observacao
);

public record AgendaDataViewDto(
    DateOnly Data,
    string? ManhaDe,
    string? ManhaAte,
    string? TardeDe,
    string? TardeAte,
    string? Observacao
);

