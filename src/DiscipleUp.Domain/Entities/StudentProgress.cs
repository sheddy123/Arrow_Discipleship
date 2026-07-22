namespace DiscipleUp.Domain.Entities;

public class StudentProgress
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int CohortId { get; set; }
    /// The mentor responsible for this student in this cohort. Null = unassigned.
    public string? MentorId { get; set; }
    public int CurrentWeek { get; set; } = 1;
    public int CurrentDay { get; set; } = 1;
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateOnly? LastActivityDate { get; set; }
    public int TotalTasksCompleted { get; set; }
    /// Lifetime experience points in this cohort. Level is derived from this by
    /// the Leveling helper (not stored, to avoid drift).
    public int Xp { get; set; }
    public bool IsOnLeaderboard { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public Cohort Cohort { get; set; } = null!;
    public ApplicationUser? Mentor { get; set; }
}
