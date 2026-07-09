using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUserController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db,
    ITokenService tokenService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await userManager.Users
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);

        var result = new List<UserSummaryDto>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            result.Add(new UserSummaryDto(
                user.Id, user.Email!, user.FirstName, user.LastName,
                roles.FirstOrDefault() ?? "Unknown",
                user.Status.ToString(),
                user.CreatedAt));
        }
        return Ok(result);
    }

    [HttpPost("invite")]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest req, CancellationToken ct)
    {
        var validRoles = new[] { "Student", "Mentor", "Parent", "Admin" };
        if (!validRoles.Contains(req.Role))
            return BadRequest(new { error = $"Invalid role. Must be one of: {string.Join(", ", validRoles)}" });

        var existing = await userManager.FindByEmailAsync(req.Email);
        if (existing is not null)
            return BadRequest(new { error = "A user with this email already exists." });

        var tempPassword = $"Welcome1!{Guid.NewGuid():N}"[..16];
        var user = new ApplicationUser
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            UserName = req.Email,
            Email = req.Email,
            Timezone = req.Timezone,
            Status = UserStatus.Active,
            DateOfBirth = new DateOnly(2000, 1, 1)
        };

        var result = await userManager.CreateAsync(user, tempPassword);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, req.Role);

        // TODO Sprint 6: send welcome email with tempPassword via Resend
        return Ok(new
        {
            user.Id,
            user.Email,
            Role = req.Role,
            // Returned in dev mode only so admin can share credentials manually
            devTempPassword = tempPassword
        });
    }

    [HttpPut("{id}/role")]
    public async Task<IActionResult> ChangeRole(string id, [FromBody] ChangeRoleRequest req, CancellationToken ct)
    {
        var validRoles = new[] { "Student", "Mentor", "Parent", "Admin" };
        if (!validRoles.Contains(req.Role))
            return BadRequest(new { error = "Invalid role." });

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var currentRoles = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, currentRoles);
        await userManager.AddToRoleAsync(user, req.Role);

        return Ok(new { message = $"Role changed to {req.Role}." });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] SetUserStatusRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        if (!req.Active && user.Id == userManager.GetUserId(User))
            return BadRequest(new { error = "You cannot deactivate your own account." });

        user.Status = req.Active ? UserStatus.Active : UserStatus.Suspended;
        await userManager.UpdateAsync(user);

        if (!req.Active)
        {
            // Revoke active sessions so a deactivated user is signed out
            var tokens = await db.RefreshTokens
                .Where(t => t.UserId == id && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var t in tokens) t.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Ok(new { status = user.Status.ToString() });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> AdminResetPassword(string id, [FromBody] AdminResetPasswordRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var removeResult = await userManager.RemovePasswordAsync(user);
        if (!removeResult.Succeeded)
            return BadRequest(new { errors = removeResult.Errors.Select(e => e.Description) });

        var addResult = await userManager.AddPasswordAsync(user, req.NewPassword);
        if (!addResult.Succeeded)
            return BadRequest(new { errors = addResult.Errors.Select(e => e.Description) });

        // Revoke all active refresh tokens so existing sessions are invalidated
        var tokens = await db.RefreshTokens
            .Where(t => t.UserId == id && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var t in tokens) t.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Password reset successfully. All existing sessions have been revoked." });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new UserSummaryDto(
            user.Id, user.Email!, user.FirstName, user.LastName,
            roles.FirstOrDefault() ?? "Unknown",
            user.Status.ToString(),
            user.CreatedAt));
    }
}
