namespace DiscipleUp.Domain.Entities;

public class TaskCompletion
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int TaskId { get; set; }
    public int CohortId { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public DiscipleTask Task { get; set; } = null!;
    public Cohort Cohort { get; set; } = null!;
}
