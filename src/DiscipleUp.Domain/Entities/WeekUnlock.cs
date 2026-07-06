namespace DiscipleUp.Domain.Entities;

public class WeekUnlock
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int CohortId { get; set; }
    public int WeekNumber { get; set; }
    public string UnlockedByUserId { get; set; } = string.Empty;
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public Cohort Cohort { get; set; } = null!;
    public ApplicationUser UnlockedBy { get; set; } = null!;
}
