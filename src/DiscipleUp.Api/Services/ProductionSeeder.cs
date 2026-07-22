using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace DiscipleUp.Api.Services;

/// <summary>
/// Minimal seed that is safe to run in every environment (including production).
/// Creates a single admin account from configuration so the deployed app has a
/// way in — no demo users, no fake content. Idempotent and a no-op unless an
/// admin email + password are supplied via config/environment variables.
/// </summary>
public class ProductionSeeder(
    UserManager<ApplicationUser> userManager,
    IConfiguration configuration,
    ILogger<ProductionSeeder> logger)
{
    public async Task SeedAsync()
    {
        var email = configuration["Admin:Email"];
        var password = configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogInformation(
                "ProductionSeeder: Admin:Email / Admin:Password not configured — skipping admin seed.");
            return;
        }

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            logger.LogInformation("ProductionSeeder: admin {Email} already exists — nothing to do.", email);
            return;
        }

        var admin = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = configuration["Admin:FirstName"] ?? "Site",
            LastName = configuration["Admin:LastName"] ?? "Admin",
            DateOfBirth = new DateOnly(1990, 1, 1),
            Timezone = "UTC",
            Status = UserStatus.Active,
            EmailConfirmed = true,
        };

        var result = await userManager.CreateAsync(admin, password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            logger.LogError("ProductionSeeder: failed to create admin {Email}: {Errors}", email, errors);
            return;
        }

        await userManager.AddToRoleAsync(admin, "Admin");
        logger.LogInformation("ProductionSeeder: created admin account {Email}.", email);
    }
}
