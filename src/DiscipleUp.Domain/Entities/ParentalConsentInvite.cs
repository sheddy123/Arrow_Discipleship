namespace DiscipleUp.Domain.Entities;

public class ParentalConsentInvite
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public string ParentEmail { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public bool IsCompleted => CompletedAt is not null;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt && !IsCompleted;

    public ApplicationUser Student { get; set; } = null!;
}
