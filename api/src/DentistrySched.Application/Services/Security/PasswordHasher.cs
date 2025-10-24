using System.Security.Cryptography;
using System.Text;

namespace DentistrySched.Application.Services.Security;

public class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16; 
    private const int KeySize = 32;  

    public string Hash(string password)
    {
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[SaltSize];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
        var key = pbkdf2.GetBytes(KeySize);
        return $"{Iterations}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(key)}";
    }

    public bool Verify(string hashed, string password)
    {
        try
        {
            var parts = hashed.Split(':');
            if (parts.Length != 3) return false;

            var iterations = int.Parse(parts[0]);
            var salt = Convert.FromBase64String(parts[1]);
            var storedKey = Convert.FromBase64String(parts[2]);

            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
            var key = pbkdf2.GetBytes(storedKey.Length);
            return CryptographicOperations.FixedTimeEquals(key, storedKey);
        }
        catch
        {
            return false;
        }
    }
}
