using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

public class Badge
{
    public int Id { get; set; }
    public BadgeType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? IconUrl { get; set; }

    /// For Custom badges: the signal it is awarded on. None for built-in badges.
    public BadgeCriterion Criterion { get; set; } = BadgeCriterion.None;

    /// For Custom badges: the value of <see cref="Criterion"/> at which the badge
    /// unlocks (e.g. Criterion=CurrentStreak, Threshold=14 → "14-day streak").
    public int Threshold { get; set; }

    public ICollection<StudentBadge> StudentBadges { get; set; } = [];
}
