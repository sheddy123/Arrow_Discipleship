namespace DiscipleUp.Domain.Entities;

public class Assignment
{
    public int Id { get; set; }
    public int WeekId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool AllowsFileUpload { get; set; } = true;

    public Week Week { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = [];
}
