using DentistrySched.Application.DTOs;

namespace DentistrySched.Application;

public interface ISlotService
{
    Task<IReadOnlyList<SlotDto>> GerarSlotsAsync(DateOnly dia, Guid dentistaId, Guid procedimentoId, CancellationToken ct);
}
