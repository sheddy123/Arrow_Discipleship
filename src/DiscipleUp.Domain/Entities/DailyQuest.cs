using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Domain.Entities;

/// One quest issued to a student for a given local day. Progress is derived from
/// their activity; only whether the reward has been claimed is stored.
public class DailyQuest
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int CohortId { get; set; }
    /// The student's local calendar date this quest belongs to.
    public DateOnly LocalDate { get; set; }
    public QuestType Type { get; set; }
    public int Target { get; set; }
    public int RewardXp { get; set; }
    public bool Claimed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
}
