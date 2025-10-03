using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin")]
[Produces("application/json")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminController(AppDbContext db) => _db = db;

    public record ProcedimentoQuery(
        string? q = null,
        int page = 1,
        int pageSize = 20,
        string orderBy = "nome",
        bool desc = false
    );

    public record ProcedimentoDto(Guid Id, string Nome);

    /// <summary>
    /// Lista de procedimentos com filtro/ordenação/paginação.
    /// </summary>
    [HttpGet("procedimentos")]
    public async Task<IActionResult> GetProcedimentos(
        [FromQuery] ProcedimentoQuery query,
        CancellationToken ct)
    {
        var page = query.page < 1 ? 1 : query.page;
        var size = query.pageSize is < 1 or > 100 ? 20 : query.pageSize;

        IQueryable<Domain.Entities.Procedimento> baseQ =
            _db.Procedimentos.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.q))
        {
            var like = $"%{query.q.Trim()}%";
            baseQ = baseQ.Where(p => EF.Functions.Like(p.Nome, like));
        }

        baseQ = query.desc
            ? baseQ.OrderByDescending(p => p.Nome)
            : baseQ.OrderBy(p => p.Nome);

        var total = await baseQ.CountAsync(ct);

        var items = await baseQ
            .Skip((page - 1) * size)
            .Take(size)
            .Select(p => new ProcedimentoDto(p.Id, p.Nome))
            .ToListAsync(ct);

        return Ok(new
        {
            total,
            page,
            pageSize = size,
            items
        });
    }
}
