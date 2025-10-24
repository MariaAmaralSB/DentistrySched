namespace DentistrySched.Application.DTO;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Name, string Email, string[] Roles, Guid TenantId, Guid? DentistaId);
