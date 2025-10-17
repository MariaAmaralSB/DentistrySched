namespace DentistrySched.Domain.Common;

public abstract class BaseEntity : ITenantEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
}
