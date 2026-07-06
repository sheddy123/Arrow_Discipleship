using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DiscipleUp.Infrastructure.Services;

public interface ITokenService
{
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);
    string GenerateRawToken();
    string HashToken(string token);
    Task<RefreshToken> CreateRefreshTokenAsync(ApplicationUser user, CancellationToken ct = default);
    Task<RefreshToken?> RotateRefreshTokenAsync(string rawToken, CancellationToken ct = default);
    Task RevokeRefreshTokenAsync(string rawToken, CancellationToken ct = default);
}

public class TokenService(IConfiguration config, AppDbContext db) : ITokenService
{
    public string GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("firstName", user.FirstName),
            new("timezone", user.Timezone),
            new("status", user.Status.ToString())
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string HashToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public async Task<RefreshToken> CreateRefreshTokenAsync(ApplicationUser user, CancellationToken ct = default)
    {
        var raw = GenerateRawToken();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };
        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);
        // Attach the raw token so the caller can return it to the client.
        // We store only the hash; the raw value never persists.
        refreshToken.ReplacedByTokenHash = raw;
        return refreshToken;
    }

    public async Task<RefreshToken?> RotateRefreshTokenAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = HashToken(rawToken);
        var existing = await db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.TokenHash == hash, ct);

        if (existing is null || !existing.IsActive) return null;

        var newRaw = GenerateRawToken();
        var newToken = new RefreshToken
        {
            UserId = existing.UserId,
            TokenHash = HashToken(newRaw),
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenHash = newToken.TokenHash;

        db.RefreshTokens.Add(newToken);
        await db.SaveChangesAsync(ct);

        newToken.ReplacedByTokenHash = newRaw;
        newToken.User = existing.User;
        return newToken;
    }

    public async Task RevokeRefreshTokenAsync(string rawToken, CancellationToken ct = default)
    {
        var hash = HashToken(rawToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash, ct);
        if (token is { IsActive: true })
        {
            token.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }
}
