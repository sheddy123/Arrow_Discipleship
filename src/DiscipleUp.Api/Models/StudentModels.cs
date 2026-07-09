namespace DiscipleUp.Api.Models;

// ── Dashboard ─────────────────────────────────────────────────────────────────

public record DashboardCohortDto(
    int Id,
    string Name,
    DateOnly StartDate,
    int CurrentWeek,
    int CurrentDay,
    int DayOfJourney,
    int TotalWeeks,
    int TotalDays
);

public record DashboardTaskDto(int Id, string Title, bool IsCompleted);

public record DashboardBadgeDto(string Name, string IconUrl, DateTime EarnedAt);

public record DashboardDto(
    int CurrentStreak,
    int LongestStreak,
    int TotalTasksCompleted,
    DashboardCohortDto? Cohort,
    IEnumerable<DashboardTaskDto> TodaysTasks,
    IEnumerable<DashboardBadgeDto> RecentBadges
);

// ── Journey ───────────────────────────────────────────────────────────────────

public enum WeekProgressStatus { Locked, InProgress, Completed }

public record WeekStatusDto(
    int WeekId,
    int WeekNumber,
    string Title,
    string? Description,
    WeekProgressStatus Status,
    int DaysCompleted,
    bool HasAssignment,
    bool AssignmentSubmitted
);

public record JourneyDto(
    int CohortId,
    string CohortName,
    int CurrentWeek,
    int CurrentDay,
    int TotalWeeks,
    int TotalDays,
    IEnumerable<WeekStatusDto> Weeks
);

// ── Week content ──────────────────────────────────────────────────────────────

public record StudentTaskDto(int Id, string Title, string Description, int OrderIndex, bool IsCompleted);

public record DayContentDto(
    int Id,
    int DayNumber,
    string Title,
    string DevotionText,
    string ScriptureReference,
    string ScriptureText,
    IEnumerable<StudentTaskDto> Tasks,
    bool AllTasksCompleted
);

public record StudentSessionDto(int Id, string Title, string VideoUrl, string? Description);

public record StudentAssignmentDto(
    int Id,
    string Title,
    string Description,
    bool AllowsFileUpload
);

public record StudentSubmissionDto(
    int Id,
    string? TextContent,
    string? FileUrl,
    string? FileName,
    DateTime SubmittedAt,
    string? MentorFeedback
);

public record WeekContentDto(
    int WeekId,
    int WeekNumber,
    string Title,
    IEnumerable<DayContentDto> Days,
    StudentAssignmentDto? Assignment,
    StudentSubmissionDto? MySubmission,
    bool ScriptureMemorized,
    IEnumerable<StudentSessionDto> Sessions
);

// ── Task completion ───────────────────────────────────────────────────────────

public record TaskCompleteResponse(bool AllDayTasksDone, bool WeekComplete, int NewStreak);

// ── Assignment submission ─────────────────────────────────────────────────────

public record SubmitAssignmentRequest(string? TextContent);

// ── Leaderboard ───────────────────────────────────────────────────────────────

public record LeaderboardEntryDto(int Rank, string Name, int CurrentStreak, int TasksCompleted, bool IsMe);

public record LeaderboardOptInRequest(bool OptIn);

// ── Student profile ───────────────────────────────────────────────────────────

public record ProfileBadgeDto(string Name, string Description, bool Earned, DateTime? EarnedAt);

public record StudentProfileDto(
    string FirstName,
    string LastName,
    string Email,
    string Timezone,
    bool IsOnLeaderboard,
    IEnumerable<ProfileBadgeDto> Badges
);

// ── Parent view ───────────────────────────────────────────────────────────────

public record ChildSummaryDto(string Id, string FirstName, string LastName);

public record ChildWeekDto(int WeekNumber, string Title, int DaysCompleted, bool AssignmentSubmitted, bool HasAssignment);

public record ChildDashboardDto(
    string FirstName,
    string LastName,
    string? CohortName,
    int CurrentWeek,
    int CurrentDay,
    int CurrentStreak,
    int LongestStreak,
    int TasksCompleted,
    int TotalTasks,
    IEnumerable<ProfileBadgeDto> Badges,
    IEnumerable<ChildWeekDto> Weeks
);
