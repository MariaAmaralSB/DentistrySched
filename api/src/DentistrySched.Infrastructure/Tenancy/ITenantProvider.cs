namespace DentistrySched.Infrastructure.Tenancy;

public interface ITenantProvider
{
    Guid TenantId { get; set; }
}
