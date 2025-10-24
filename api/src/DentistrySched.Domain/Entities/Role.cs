using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Entities;

public class Role : BaseTenantEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<UserRole> Users { get; set; } = new List<UserRole>();
}
