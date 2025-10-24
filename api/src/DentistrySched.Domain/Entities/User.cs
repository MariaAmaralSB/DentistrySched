using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class User : BaseTenantEntity
{
    public string Name { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public bool IsActive { get; set; } = true;

    public Guid? DentistaId { get; set; }
    public Dentista? Dentista { get; set; }

    public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
}
