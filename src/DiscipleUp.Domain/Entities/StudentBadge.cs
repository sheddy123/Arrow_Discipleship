namespace DiscipleUp.Domain.Entities;

public class StudentBadge
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int BadgeId { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public Badge Badge { get; set; } = null!;
}
