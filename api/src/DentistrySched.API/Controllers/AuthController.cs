using System.Security.Claims;
using DentistrySched.API.Services;
using DentistrySched.Application.DTO;
using DentistrySched.Application.Services.Security;
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

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var tenantId = HttpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        if (tenantId is null || !Guid.TryParse(tenantId, out var tid))
            return BadRequest("Tenant inválido.");

        var user = await _db.Users
            .Include(u => u.Roles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.TenantId == tid && u.Email == req.Email, ct);

        if (user is null || !_hasher.Verify(user.PasswordHash, req.Password))
            return Unauthorized();

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

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<RegisterUserResponse>> Register([FromBody] RegisterUserDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("E-mail e senha são obrigatórios.");

        var tenantIdHeader = HttpContext.Request.Headers["X-Tenant-Id"].FirstOrDefault();
        if (tenantIdHeader is null || !Guid.TryParse(tenantIdHeader, out var tid))
            return BadRequest("Tenant inválido.");

        var exists = await _db.Users.AnyAsync(u => u.TenantId == tid && u.Email == dto.Email, ct);
        if (exists) return Conflict("E-mail já cadastrado neste tenant.");

        Guid? vinculoDentista = null;
        if (dto.DentistaId is Guid dId && dId != Guid.Empty)
        {
            var ok = await _db.Dentistas.AnyAsync(d => d.Id == dId && d.TenantId == tid, ct);
            if (!ok) return BadRequest("DentistaId inválido para este tenant.");
            vinculoDentista = dId;
        }

        var roleName = string.IsNullOrWhiteSpace(dto.Role) ? "Dentista" : dto.Role.Trim();
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.TenantId == tid && r.Name == roleName, ct);
        if (role is null)
        {
            role = new DentistrySched.Domain.Entities.Role { Name = roleName, TenantId = tid };
            _db.Roles.Add(role);
            await _db.SaveChangesAsync(ct);
        }

        var user = new DentistrySched.Domain.Entities.User
        {
            Email = dto.Email.Trim(),
            Name = string.IsNullOrWhiteSpace(dto.Name) ? dto.Email.Trim() : dto.Name!.Trim(),
            IsActive = true,
            TenantId = tid,
            DentistaId = vinculoDentista,
            PasswordHash = _hasher.Hash(dto.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        _db.UserRoles.Add(new DentistrySched.Domain.Entities.UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            TenantId = tid
        });

        await _db.SaveChangesAsync(ct);

        var roles = new[] { role.Name };
        return Ok(new RegisterUserResponse(user.Id, user.Email, roles, user.TenantId, user.DentistaId));
    }

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
