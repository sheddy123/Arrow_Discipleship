using System.ComponentModel.DataAnnotations;
using DiscipleUp.Domain.Enums;

namespace DiscipleUp.Api.Models;

// ── Cohort ────────────────────────────────────────────────────────────────────

public record CreateCohortRequest(
    [Required, MaxLength(200)] string Name,
    [Required] DateOnly StartDate,
    [Required] string MentorId,
    int LateEntryWindowDays = 5,
    bool IsPaid = false,
    [Range(1, 52)] int WeekCount = 4
);

public record UpdateCohortRequest(
    [MaxLength(200)] string? Name,
    DateOnly? StartDate,
    string? MentorId,
    int? LateEntryWindowDays,
    bool? IsPaid
);

// ── Week ──────────────────────────────────────────────────────────────────────

public record CreateWeekRequest(
    [Required, MaxLength(200)] string Title,
    string? Description
);

public record UpdateWeekRequest(
    [MaxLength(200)] string? Title,
    string? Description
);

// ── Day ───────────────────────────────────────────────────────────────────────

public record CreateDayRequest(
    [Required, MaxLength(200)] string Title,
    string? DevotionText,
    string? ScriptureReference,
    string? ScriptureText
);

public record UpdateDayRequest(
    [MaxLength(200)] string? Title,
    string? DevotionText,
    string? ScriptureReference,
    string? ScriptureText
);

// ── Task ──────────────────────────────────────────────────────────────────────

public record CreateTaskRequest(
    [Required, MaxLength(300)] string Title,
    string? Description,
    int OrderIndex = 0
);

public record UpdateTaskRequest(
    [MaxLength(300)] string? Title,
    string? Description,
    int? OrderIndex
);

// ── Assignment ────────────────────────────────────────────────────────────────

public record CreateAssignmentRequest(
    [Required, MaxLength(300)] string Title,
    [Required] string Description,
    bool AllowsFileUpload = true
);

public record UpdateAssignmentRequest(
    [MaxLength(300)] string? Title,
    string? Description,
    bool? AllowsFileUpload
);

// ── User management ───────────────────────────────────────────────────────────

public record InviteUserRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required, EmailAddress] string Email,
    [Required] string Role,
    string Timezone = "UTC"
);

public record ChangeRoleRequest(
    [Required] string Role
);

public record SetUserStatusRequest(
    bool Active
);

public record AdminResetPasswordRequest(
    [Required, MinLength(8)] string NewPassword
);

public record EnrolStudentRequest(
    [Required] string StudentId
);

// ── Mentor assignment ─────────────────────────────────────────────────────────

public record AddCohortMentorRequest(
    [Required] string MentorId
);

public record AssignStudentMentorRequest(
    string? MentorId
);

public record AutoAssignMentorsRequest(
    bool RedistributeAll = false
);

public record MoveStudentRequest(
    [Required] int CohortId
);

public record CohortRosterDto(
    IEnumerable<RosterMentorDto> Mentors,
    IEnumerable<RosterStudentDto> Students
);

public record RosterMentorDto(
    string Id,
    string Name,
    string Email,
    bool IsLead,
    int StudentCount
);

public record RosterStudentDto(
    string Id,
    string Name,
    string Email,
    string? MentorId,
    string? MentorName
);

// ── Badges ────────────────────────────────────────────────────────────────────

public record BadgeDto(
    int Id,
    string Type,
    string Name,
    string Description,
    string? IconUrl,
    string Criterion,
    int Threshold,
    bool IsCustom,
    int EarnedCount
);

public record CreateBadgeRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(300)] string Description,
    string? IconUrl,
    [Required] BadgeCriterion Criterion,
    [Range(1, 100000)] int Threshold
);

public record UpdateBadgeRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(300)] string Description,
    string? IconUrl,
    BadgeCriterion Criterion,
    [Range(1, 100000)] int Threshold
);

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record CohortSummaryDto(
    int Id,
    string Name,
    DateOnly StartDate,
    int LateEntryWindowDays,
    string MentorId,
    string MentorName,
    bool IsPaid,
    CohortStatus Status,
    int WeekCount,
    int EnrolledStudents
);

public record CohortDetailDto(
    int Id,
    string Name,
    DateOnly StartDate,
    int LateEntryWindowDays,
    string MentorId,
    string MentorName,
    bool IsPaid,
    CohortStatus Status,
    IEnumerable<WeekDto> Weeks
);

public record WeekDto(
    int Id,
    int WeekNumber,
    string Title,
    string? Description,
    bool IsPublished,
    IEnumerable<DayDto> Days,
    IEnumerable<AssignmentDto> Assignments
);

public record DayDto(
    int Id,
    int DayNumber,
    string Title,
    string DevotionText,
    string? ScriptureReference,
    string? ScriptureText,
    IEnumerable<TaskDto> Tasks
);

public record TaskDto(
    int Id,
    string Title,
    string? Description,
    int OrderIndex
);

public record AssignmentDto(
    int Id,
    string Title,
    string Description,
    bool AllowsFileUpload
);

public record UserSummaryDto(
    string Id,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string Status,
    DateTime CreatedAt
);
