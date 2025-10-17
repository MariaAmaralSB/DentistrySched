using Microsoft.AspNetCore.Http;

namespace DentistrySched.Infrastructure.Tenancy;

public class TenantProvider : ITenantProvider
{
    public Guid TenantId { get; set; }   
    public const string HeaderName = "X-Tenant-Id";

    public TenantProvider(IHttpContextAccessor accessor)
    {
        var ctx = accessor.HttpContext;
        if (ctx != null &&
            ctx.Request.Headers.TryGetValue(HeaderName, out var raw) &&
            Guid.TryParse(raw.FirstOrDefault(), out var id))
        {
            TenantId = id; 
        }
        
    }
}
