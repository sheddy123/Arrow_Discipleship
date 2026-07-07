namespace DiscipleUp.Api.Models;

// ── Mentor dashboard ──────────────────────────────────────────────────────────

public record MentorCohortSummaryDto(
    int Id,
    string Name,
    DateOnly StartDate,
    string Status,
    int StudentCount,
    int PendingSubmissions,
    int PendingPrayerRequests
);

public record MentorStudentRowDto(
    string StudentId,
    string FirstName,
    string LastName,
    string Email,
    int CurrentWeek,
    int CurrentDay,
    int CurrentStreak,
    int TasksCompleted,
    int TotalTasks,
    int SubmissionCount,
    DateOnly? LastActivityDate,
    bool AtRisk
);

public record MentorDashboardDto(
    MentorCohortSummaryDto Cohort,
    int AvgTasksCompleted,
    int OnTrackCount,
    int AtRiskCount,
    IEnumerable<MentorStudentRowDto> Students
);

// ── Review queue ──────────────────────────────────────────────────────────────

public record ReviewSubmissionDto(
    int Id,
    string StudentId,
    string StudentName,
    int WeekNumber,
    string AssignmentTitle,
    string? TextContent,
    string? FileUrl,
    string? FileName,
    DateTime SubmittedAt,
    string? Feedback,
    DateTime? FeedbackAt
);

public record LeaveFeedbackRequest(string Comment);

// ── Student profile ───────────────────────────────────────────────────────────

public record ProfileWeekDto(
    int WeekNumber,
    string Title,
    int DaysCompleted,
    int TasksCompleted,
    int TotalTasks,
    bool AssignmentSubmitted,
    bool HasAssignment,
    bool ManuallyUnlocked
);

public record ProfileSubmissionDto(
    int Id,
    int WeekNumber,
    string AssignmentTitle,
    string? TextContent,
    DateTime SubmittedAt,
    string? Feedback
);

public record MentorStudentProfileDto(
    string StudentId,
    string FirstName,
    string LastName,
    string Email,
    int CurrentWeek,
    int CurrentDay,
    int CurrentStreak,
    int LongestStreak,
    DateOnly? LastActivityDate,
    DateTime EnrolledAt,
    IEnumerable<ProfileWeekDto> Weeks,
    IEnumerable<ProfileSubmissionDto> Submissions
);

// ── Week unlock ───────────────────────────────────────────────────────────────

public record UnlockWeekRequest(string StudentId, int WeekNumber);

// ── Announcements ─────────────────────────────────────────────────────────────

public record CreateAnnouncementRequest(string Title, string Content);

public record AnnouncementDto(
    int Id,
    string Title,
    string Content,
    string AuthorName,
    DateTime CreatedAt
);

// ── Sessions ──────────────────────────────────────────────────────────────────

public record AddSessionRequest(int WeekNumber, string Title, string VideoUrl, string? Description);

// ── Prayer wall ───────────────────────────────────────────────────────────────

public record PrayerRequestDto(
    int Id,
    string AuthorName,
    string Content,
    string Status,
    DateTime CreatedAt
);

public record CreatePrayerRequestRequest(string Content);
