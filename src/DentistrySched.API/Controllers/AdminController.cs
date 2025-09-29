using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminController(AppDbContext db) => _db = db;

    [HttpGet("dentistas")]
    public async Task<IActionResult> GetDentistas(CancellationToken ct) =>
        Ok(await _db.Dentistas.AsNoTracking().ToListAsync(ct));

    [HttpGet("procedimentos")]
    public async Task<IActionResult> GetProcedimentos(CancellationToken ct) =>
        Ok(await _db.Procedimentos.AsNoTracking().ToListAsync(ct));

    [HttpGet("agenda-regras")]
    public async Task<IActionResult> GetAgendaRegras(CancellationToken ct) =>
        Ok(await _db.AgendaRegras.AsNoTracking().ToListAsync(ct));
}
