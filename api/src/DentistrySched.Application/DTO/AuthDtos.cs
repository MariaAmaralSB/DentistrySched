namespace DentistrySched.Application.DTO;

public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Name, string Email, string[] Roles, Guid TenantId, Guid? DentistaId);
public record RegisterUserDto(
    string Email,
    string Password,
    string? Name,
    Guid? DentistaId,      
    string Role           
);

public record RegisterUserResponse(
    Guid Id,
    string Email,
    string[] Roles,
    Guid TenantId,
    Guid? DentistaId
);