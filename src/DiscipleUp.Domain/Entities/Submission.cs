namespace DiscipleUp.Domain.Entities;

public class Submission
{
    public int Id { get; set; }
    public string StudentId { get; set; } = string.Empty;
    public int AssignmentId { get; set; }
    public int CohortId { get; set; }
    public string? TextContent { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Student { get; set; } = null!;
    public Assignment Assignment { get; set; } = null!;
    public Cohort Cohort { get; set; } = null!;
    public SubmissionFeedback? Feedback { get; set; }
}
