using DentistrySched.Application.DTO;

namespace DentistrySched.Application.Interface;

public interface ISlotService
{
    Task<IReadOnlyList<SlotDto>> GerarSlotsAsync(DateOnly dia, Guid dentistaId, Guid procedimentoId, CancellationToken ct);
}
