using System;
using DentistrySched.Infrastructure.Tenancy;

namespace DentistrySched.Infrastructure.Tenancy
{
    public sealed class DesignTimeTenantProvider : ITenantProvider
    {
        public Guid TenantId { get; set; }

        public DesignTimeTenantProvider(Guid? tenant = null)
        {
            if (Guid.TryParse(Environment.GetEnvironmentVariable("TENANT_ID"), out var env))
                TenantId = env;
            else
                TenantId = tenant ?? Guid.Empty;
        }
    }
}
