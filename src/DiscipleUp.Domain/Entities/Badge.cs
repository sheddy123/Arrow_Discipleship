using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

public class Badge
{
    public int Id { get; set; }
    public BadgeType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? IconUrl { get; set; }

    public ICollection<StudentBadge> StudentBadges { get; set; } = [];
}
