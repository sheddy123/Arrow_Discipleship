using System.Security.Cryptography;
using System.Text;
using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ITokenService tokenService,
    AppDbContext db) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        var age = CalculateAge(req.DateOfBirth);
        var requiresConsent = age < 13;

        if (requiresConsent && string.IsNullOrWhiteSpace(req.ParentEmail))
            return BadRequest(new { error = "Parent email is required for users under 13." });

        var user = new ApplicationUser
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            UserName = req.Email,
            Email = req.Email,
            DateOfBirth = req.DateOfBirth,
            Timezone = req.Timezone,
            Status = requiresConsent ? UserStatus.Pending : UserStatus.Active,
            ParentEmail = req.ParentEmail
        };

        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, "Student");

        if (requiresConsent)
        {
            await SendParentalConsentInviteAsync(user, req.ParentEmail!, ct);
            return Ok(new { message = "Account created. A consent invitation has been sent to the parent email. The account will be active once the parent completes registration." });
        }

        var roles = await userManager.GetRolesAsync(user);
        var refreshToken = await tokenService.CreateRefreshTokenAsync(user, ct);
        return Ok(new AuthResponse(
            tokenService.GenerateAccessToken(user, roles),
            refreshToken.ReplacedByTokenHash!,
            user.Id,
            user.Email!,
            user.FirstName,
            roles.First(),
            user.Status.ToString()));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null)
            return Unauthorized(new { error = "Invalid credentials." });

        if (user.Status == UserStatus.Pending)
            return Unauthorized(new { error = "Account is pending parental consent." });

        var result = await signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
            return Unauthorized(new { error = result.IsLockedOut ? "Account is locked. Try again later." : "Invalid credentials." });

        var roles = await userManager.GetRolesAsync(user);
        var refreshToken = await tokenService.CreateRefreshTokenAsync(user, ct);
        return Ok(new AuthResponse(
            tokenService.GenerateAccessToken(user, roles),
            refreshToken.ReplacedByTokenHash!,
            user.Id,
            user.Email!,
            user.FirstName,
            roles.First(),
            user.Status.ToString()));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req, CancellationToken ct)
    {
        var newToken = await tokenService.RotateRefreshTokenAsync(req.RefreshToken, ct);
        if (newToken is null)
            return Unauthorized(new { error = "Invalid or expired refresh token." });

        var user = newToken.User;
        var roles = await userManager.GetRolesAsync(user);
        return Ok(new AuthResponse(
            tokenService.GenerateAccessToken(user, roles),
            newToken.ReplacedByTokenHash!,
            user.Id,
            user.Email!,
            user.FirstName,
            roles.First(),
            user.Status.ToString()));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest req, CancellationToken ct)
    {
        await tokenService.RevokeRefreshTokenAsync(req.RefreshToken, ct);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        // Always return 200 to prevent email enumeration
        if (user is null || user.Status != UserStatus.Active)
            return Ok(new { message = "If an account with that email exists, a reset link has been sent." });

        var rawToken = tokenService.GenerateRawToken();
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenService.HashToken(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(2)
        };
        db.PasswordResetTokens.Add(resetToken);
        await db.SaveChangesAsync(ct);

        // TODO Sprint 6: send email via Resend with reset link containing rawToken
        // For now, return the token in dev mode only
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            return Ok(new { message = "Reset token issued.", devToken = rawToken });

        return Ok(new { message = "If an account with that email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null)
            return BadRequest(new { error = "Invalid request." });

        var tokenHash = tokenService.HashToken(req.Token);
        var resetToken = await db.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.UserId == user.Id && t.TokenHash == tokenHash, ct);

        if (resetToken is null || !resetToken.IsValid)
            return BadRequest(new { error = "Invalid or expired reset token." });

        var resetResult = await userManager.RemovePasswordAsync(user);
        if (!resetResult.Succeeded)
            return BadRequest(new { errors = resetResult.Errors.Select(e => e.Description) });

        var addResult = await userManager.AddPasswordAsync(user, req.NewPassword);
        if (!addResult.Succeeded)
            return BadRequest(new { errors = addResult.Errors.Select(e => e.Description) });

        resetToken.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Password reset successfully." });
    }

    [HttpPost("consent/complete")]
    public async Task<IActionResult> CompleteParentalConsent(
        [FromBody] CompleteParentalConsentRequest req, CancellationToken ct)
    {
        var tokenHash = tokenService.HashToken(req.Token);
        var invite = await db.ParentalConsentInvites
            .Include(i => i.Student)
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, ct);

        if (invite is null || invite.IsExpired || invite.IsCompleted)
            return BadRequest(new { error = "Invalid or expired consent link." });

        // Create the parent account
        var parentEmail = invite.ParentEmail;
        var existingParent = await userManager.FindByEmailAsync(parentEmail);
        ApplicationUser parent;

        if (existingParent is null)
        {
            parent = new ApplicationUser
            {
                FirstName = req.FirstName,
                LastName = req.LastName,
                UserName = parentEmail,
                Email = parentEmail,
                Timezone = invite.Student.Timezone,
                Status = UserStatus.Active,
                DateOfBirth = new DateOnly(1980, 1, 1)
            };
            var createResult = await userManager.CreateAsync(parent, req.Password);
            if (!createResult.Succeeded)
                return BadRequest(new { errors = createResult.Errors.Select(e => e.Description) });

            await userManager.AddToRoleAsync(parent, "Parent");
        }
        else
        {
            parent = existingParent;
        }

        // Link parent to student and activate student account
        var student = invite.Student;
        student.LinkedParentId = parent.Id;
        student.Status = UserStatus.Active;
        invite.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Parental consent completed. The student account is now active." });
    }

    [HttpPost("consent/resend")]
    public async Task<IActionResult> ResendConsentInvite([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null || user.Status != UserStatus.Pending || user.ParentEmail is null)
            return Ok(new { message = "If applicable, a new invitation has been sent." });

        await SendParentalConsentInviteAsync(user, user.ParentEmail, ct);
        return Ok(new { message = "If applicable, a new invitation has been sent." });
    }

    private async Task SendParentalConsentInviteAsync(ApplicationUser student, string parentEmail, CancellationToken ct)
    {
        var rawToken = tokenService.GenerateRawToken();
        var invite = new ParentalConsentInvite
        {
            StudentId = student.Id,
            ParentEmail = parentEmail,
            TokenHash = tokenService.HashToken(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(72)
        };
        db.ParentalConsentInvites.Add(invite);
        await db.SaveChangesAsync(ct);
        // TODO Sprint 6: send email via Resend with consent link
    }

    private static int CalculateAge(DateOnly dateOfBirth)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age)) age--;
        return age;
    }
}
