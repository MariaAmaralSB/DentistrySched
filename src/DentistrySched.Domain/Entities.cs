namespace DentistrySched.Domain;

public enum ConsultaStatus { Agendada, Confirmada, Remarcada, Cancelada, NoShow }

public class Dentista
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string? CRO { get; set; }
}

public class Procedimento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public int DuracaoMin { get; set; }
    public int BufferMin { get; set; }
}

public class AgendaRegra
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DentistaId { get; set; }
    public DayOfWeek DiaSemana { get; set; }
    public TimeOnly InicioManha { get; set; }
    public TimeOnly FimManha { get; set; }
    public TimeOnly? InicioTarde { get; set; }
    public TimeOnly? FimTarde { get; set; }
}

public class Paciente
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string CelularWhatsApp { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool ConsentimentoWhatsApp { get; set; } = true;
}

public class Consulta
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DentistaId { get; set; }
    public Guid PacienteId { get; set; }
    public Guid ProcedimentoId { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fim { get; set; }
    public ConsultaStatus Status { get; set; } = ConsultaStatus.Agendada;
    public PreTriagem? PreTriagem { get; set; }
}

public class PreTriagem
{
    public string? Descricao { get; set; }
    public string[] Sintomas { get; set; } = Array.Empty<string>();
}
