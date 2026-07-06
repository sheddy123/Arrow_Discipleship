namespace DiscipleUp.Domain.Entities;

public class DiscipleTask
{
    public int Id { get; set; }
    public int DayId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; }

    public Day Day { get; set; } = null!;
    public ICollection<TaskCompletion> Completions { get; set; } = [];
}
