namespace DiscipleUp.Domain.Entities;

public class ScriptureMemory
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int WeekId { get; set; }
    public DateTime MarkedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public Week Week { get; set; } = null!;
}
