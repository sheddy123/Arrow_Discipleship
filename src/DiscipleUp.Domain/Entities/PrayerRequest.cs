using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

public class PrayerRequest
{
    public int Id { get; set; }
    public int CohortId { get; set; }
    public string AuthorId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public PrayerRequestStatus Status { get; set; } = PrayerRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ModeratedAt { get; set; }
    public string? ModeratedByUserId { get; set; }

    public Cohort Cohort { get; set; } = null!;
    public ApplicationUser Author { get; set; } = null!;
    public ApplicationUser? ModeratedBy { get; set; }
}
