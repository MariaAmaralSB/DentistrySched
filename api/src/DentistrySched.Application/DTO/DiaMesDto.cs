using System.Text.Json.Serialization;

namespace DentistrySched.Application.DTO
{
    public class DiaMesDto
    {
        [JsonPropertyName("dia")]
        public int Dia { get; set; }

        [JsonPropertyName("fechado")]
        public bool Fechado { get; set; }

        [JsonPropertyName("livres")]
        public int Livres { get; set; }

        [JsonPropertyName("ocupados")]
        public int Ocupados { get; set; }

        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonPropertyName("motivo")]
        public string? Motivo { get; set; }

        public DiaMesDto(int dia, bool fechado, int livres, int ocupados, int total, string? motivo)
        {
            Dia = dia;
            Fechado = fechado;
            Livres = livres;
            Ocupados = ocupados;
            Total = total;
            Motivo = motivo;
        }
    }
}
