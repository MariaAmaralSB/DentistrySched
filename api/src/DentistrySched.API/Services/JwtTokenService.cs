using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DentistrySched.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DentistrySched.API.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "dentistry";
    public string Audience { get; set; } = "dentistry-web";
    public string Key { get; set; } = default!; 
    public int ExpMinutes { get; set; } = 480;
}

public class JwtTokenService
{
    private readonly JwtOptions _opt;
    public JwtTokenService(IOptions<JwtOptions> opt) => _opt = opt.Value;

    public string Create(User u, IEnumerable<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", u.Id.ToString()),
            new("email", u.Email),
            new("name", u.Name ?? u.Email),
            new("tenant", u.TenantId.ToString())
        };
        if (u.DentistaId is Guid d) claims.Add(new("dentistaId", d.ToString()));
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var jwt = new JwtSecurityToken(
            _opt.Issuer, _opt.Audience, claims,
            expires: DateTime.UtcNow.AddMinutes(_opt.ExpMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
