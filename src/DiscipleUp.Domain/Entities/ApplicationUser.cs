using DiscipleUp.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace DiscipleUp.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string Timezone { get; set; } = "UTC";
    public UserStatus Status { get; set; } = UserStatus.Active;
    public string? ParentEmail { get; set; }
    public string? LinkedParentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? LinkedParent { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<CohortUser> CohortUsers { get; set; } = [];
    public ICollection<StudentProgress> StudentProgresses { get; set; } = [];
    public ICollection<StudentBadge> StudentBadges { get; set; } = [];
}
