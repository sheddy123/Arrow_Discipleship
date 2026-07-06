namespace DiscipleUp.Domain.Entities;

public class SubmissionFeedback
{
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    public string MentorId { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Submission Submission { get; set; } = null!;
    public ApplicationUser Mentor { get; set; } = null!;
}
