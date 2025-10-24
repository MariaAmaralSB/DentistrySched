using System.Security.Claims;
using DentistrySched.API.Services;
using DentistrySched.Application.DTO;
using DentistrySched.Application.Services.Security;
using DentistrySched.Domain.Entities;
using DentistrySched.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentistrySched.API.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;
    private readonly PasswordHasher _hasher;

    public AuthController(AppDbContext db, JwtTokenService jwt, PasswordHasher hasher)
    {
        _db = db;
        _jwt = jwt;
        _hasher = hasher;
    }

    // ============================================================
    // LOGIN
    // ============================================================
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var tenantId = HttpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        if (tenantId is null || !Guid.TryParse(tenantId, out var tid))
            return BadRequest("Tenant inválido.");

        var user = await _db.Users
            .Include(u => u.Roles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.TenantId == tid && u.Email == req.Email, ct);

        if (user is null) return Unauthorized();

        var ok = _hasher.Verify(user.PasswordHash, req.Password);
        if (!ok) return Unauthorized();

        var roles = user.Roles.Select(r => r.Role.Name).ToArray();
        var token = _jwt.Create(user, roles);

        return new LoginResponse(
            token,
            user.Name ?? user.Email,
            user.Email,
            roles,
            user.TenantId,
            user.DentistaId
        );
    }

    // ============================================================
    // CRIAR USUÁRIO (ADMIN)
    // ============================================================
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        var tenantId = HttpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        if (tenantId is null || !Guid.TryParse(tenantId, out var tid))
            return BadRequest("Tenant inválido.");

        if (await _db.Users.AnyAsync(u => u.Email == req.Email && u.TenantId == tid, ct))
            return Conflict("E-mail já cadastrado.");

        var user = new User
        {
            TenantId = tid,
            Name = req.Name,
            Email = req.Email,
            PasswordHash = _hasher.Hash(req.Password),
            IsActive = true,
            DentistaId = req.DentistaId
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        var role = await _db.Roles.FirstOrDefaultAsync(r =>
            r.TenantId == tid && r.Name == req.Role, ct);

        if (role == null)
            return BadRequest($"Papel '{req.Role}' não encontrado para o tenant.");

        _db.UserRoles.Add(new UserRole
        {
            TenantId = tid,
            UserId = user.Id,
            RoleId = role.Id
        });

        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Me), new { id = user.Id }, new
        {
            user.Id,
            user.Email,
            user.Name,
            Role = req.Role
        });
    }

    public record RegisterRequest(
        string Name,
        string Email,
        string Password,
        string Role,
        Guid? DentistaId
    );

    // ============================================================
    // PERFIL ATUAL
    // ============================================================
    [HttpGet("me")]
    [Authorize]
    public ActionResult<object> Me()
    {
        return new
        {
            id = User.FindFirstValue("sub"),
            email = User.FindFirstValue("email"),
            name = User.FindFirstValue("name"),
            tenant = User.FindFirstValue("tenant"),
            dentistaId = User.FindFirstValue("dentistaId"),
            roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray()
        };
    }
}
