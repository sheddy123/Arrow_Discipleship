namespace DiscipleUp.Domain.Entities;

public class Day
{
    public int Id { get; set; }
    public int WeekId { get; set; }
    public int DayNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string DevotionText { get; set; } = string.Empty;
    public string? ScriptureReference { get; set; }
    public string? ScriptureText { get; set; }

    public Week Week { get; set; } = null!;
    public ICollection<DiscipleTask> Tasks { get; set; } = [];
}
