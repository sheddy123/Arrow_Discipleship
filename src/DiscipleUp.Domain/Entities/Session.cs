namespace DiscipleUp.Domain.Entities;

public class Session
{
    public int Id { get; set; }
    public int WeekId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string VideoUrl { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AddedByUserId { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Week Week { get; set; } = null!;
    public ApplicationUser AddedBy { get; set; } = null!;
}
