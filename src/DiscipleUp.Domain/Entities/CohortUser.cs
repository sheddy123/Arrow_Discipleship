using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

public class CohortUser
{
    public int CohortId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public CohortRole Role { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

    public Cohort Cohort { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
