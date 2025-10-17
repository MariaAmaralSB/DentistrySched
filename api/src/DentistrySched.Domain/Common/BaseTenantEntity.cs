using System;
using DentistrySched.Domain.Common;

namespace DentistrySched.Domain.Common;

public abstract class BaseTenantEntity : ITenantEntity
{
    public Guid Id { get; set; }        
    public Guid TenantId { get; set; }
}
