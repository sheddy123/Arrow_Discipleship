namespace DiscipleUp.Domain.Entities;

public class Announcement
{
    public int Id { get; set; }
    public int CohortId { get; set; }
    public string AuthorId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Cohort Cohort { get; set; } = null!;
    public ApplicationUser Author { get; set; } = null!;
}
