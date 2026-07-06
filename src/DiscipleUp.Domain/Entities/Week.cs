namespace DiscipleUp.Domain.Entities;

public class Week
{
    public int Id { get; set; }
    public int CohortId { get; set; }
    public int WeekNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPublished { get; set; }

    public Cohort Cohort { get; set; } = null!;
    public ICollection<Day> Days { get; set; } = [];
    public ICollection<Assignment> Assignments { get; set; } = [];
    public ICollection<Session> Sessions { get; set; } = [];
}
