using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

public class Cohort
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public int LateEntryWindowDays { get; set; } = 5;
    public string MentorId { get; set; } = string.Empty;
    public bool IsPaid { get; set; }
    public CohortStatus Status { get; set; } = CohortStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Mentor { get; set; } = null!;
    public ICollection<CohortUser> CohortUsers { get; set; } = [];
    public ICollection<Week> Weeks { get; set; } = [];
}
