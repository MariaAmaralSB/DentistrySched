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


    [HttpGet("procedimentos")]
    public async Task<IActionResult> GetProcedimentos(CancellationToken ct) =>
        Ok(await _db.Procedimentos.AsNoTracking().ToListAsync(ct));

    
}
