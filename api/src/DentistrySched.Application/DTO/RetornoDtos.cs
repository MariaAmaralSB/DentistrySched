
namespace DentistrySched.Application.DTO
{
    public class RetornoDtos
    {
        public record RetornoSugestaoDto(DateOnly Dia, List<string> HorariosISO);
        public record CriarRetornoDto(Guid ConsultaOrigemId, Guid DentistaId, Guid ProcedimentoId, DateTime Inicio);
    }
}
