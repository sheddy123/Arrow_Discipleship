using DiscipleUp.Api.Models;
using DiscipleUp.Api.Services;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/mentor")]
[Authorize(Roles = "Mentor,Admin")]
public class MentorController(AppDbContext db, CohortMentorService mentors) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// A mentor may only touch cohorts they belong to (as lead or co-mentor);
    /// admins may touch any.
    private async Task<Cohort?> GetAuthorizedCohort(int cohortId)
    {
        var cohort = await db.Cohorts.FindAsync(cohortId);
        if (cohort is null) return null;
        if (User.IsInRole("Admin")) return cohort;
        if (cohort.MentorId == UserId) return cohort;
        var isCoMentor = await db.CohortUsers.AnyAsync(cu =>
            cu.CohortId == cohortId && cu.UserId == UserId && cu.Role == CohortRole.Mentor);
        return isCoMentor ? cohort : null;
    }

    /// A co-mentor (neither an admin nor the cohort's lead) only sees the students
    /// assigned to them; the lead mentor and admins see the whole cohort.
    private bool IsRestrictedTo(Cohort cohort) =>
        !User.IsInRole("Admin") && cohort.MentorId != UserId;

    /// The ids of students assigned to the current mentor, or null when they may
    /// see everyone (lead / admin). Callers treat null as "no filter".
    private async Task<List<string>?> AssignedStudentIdsIfRestricted(Cohort cohort) =>
        IsRestrictedTo(cohort)
            ? await db.StudentProgresses
                .Where(sp => sp.CohortId == cohort.Id && sp.MentorId == UserId)
                .Select(sp => sp.StudentId)
                .ToListAsync()
            : null;

    /// Whether the current mentor may act on this specific student in the cohort.
    private async Task<bool> CanAccessStudent(Cohort cohort, string studentId) =>
        !IsRestrictedTo(cohort)
        || await db.StudentProgresses.AnyAsync(sp =>
            sp.CohortId == cohort.Id && sp.StudentId == studentId && sp.MentorId == UserId);

    // GET api/mentor/cohorts — cohorts this mentor leads
    [HttpGet("cohorts")]
    public async Task<IActionResult> GetMyCohorts()
    {
        var isAdmin = User.IsInRole("Admin");
        var userId = UserId;

        // Fetch the base cohort rows first, then compute each per-cohort aggregate
        // as its own grouped query. Projecting multiple correlated `db.X.Count(...)`
        // subqueries into the DTO constructor here crashes the query pipeline.
        var cohorts = await db.Cohorts
            .Where(c => isAdmin || c.MentorId == userId
                || c.CohortUsers.Any(cu => cu.UserId == userId && cu.Role == CohortRole.Mentor))
            .OrderByDescending(c => c.StartDate)
            .Select(c => new { c.Id, c.Name, c.StartDate, Status = c.Status.ToString() })
            .ToListAsync();

        var cohortIds = cohorts.Select(c => c.Id).ToList();

        var studentCounts = await db.CohortUsers
            .Where(cu => cohortIds.Contains(cu.CohortId) && cu.Role == CohortRole.Student)
            .GroupBy(cu => cu.CohortId)
            .Select(g => new { CohortId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CohortId, x => x.Count);

        var pendingReviewCounts = await db.Submissions
            .Where(s => cohortIds.Contains(s.CohortId) && s.Feedback == null)
            .GroupBy(s => s.CohortId)
            .Select(g => new { CohortId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CohortId, x => x.Count);

        var pendingPrayerCounts = await db.PrayerRequests
            .Where(pr => cohortIds.Contains(pr.CohortId) && pr.Status == PrayerRequestStatus.Pending)
            .GroupBy(pr => pr.CohortId)
            .Select(g => new { CohortId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CohortId, x => x.Count);

        var result = cohorts.Select(c => new MentorCohortSummaryDto(
            c.Id, c.Name, c.StartDate, c.Status,
            studentCounts.GetValueOrDefault(c.Id),
            pendingReviewCounts.GetValueOrDefault(c.Id),
            pendingPrayerCounts.GetValueOrDefault(c.Id))).ToList();

        return Ok(result);
    }

    // GET api/mentor/cohorts/{cohortId}/dashboard
    [HttpGet("cohorts/{cohortId:int}/dashboard")]
    public async Task<IActionResult> GetDashboard(int cohortId)
    {
        var cohort = await GetAuthorizedCohort(cohortId);
        if (cohort is null) return Forbid();

        // Co-mentors only see their assigned students; the lead/admin see all.
        var assignedIds = await AssignedStudentIdsIfRestricted(cohort);

        var totalTasks = await db.Tasks.CountAsync(t => t.Day.Week.CohortId == cohortId);

        var studentQuery = db.CohortUsers
            .Where(cu => cu.CohortId == cohortId && cu.Role == CohortRole.Student);
        if (assignedIds is not null)
            studentQuery = studentQuery.Where(cu => assignedIds.Contains(cu.UserId));

        var students = await studentQuery
            .Select(cu => new
            {
                cu.User.Id, cu.User.FirstName, cu.User.LastName, cu.User.Email,
                Progress = db.StudentProgresses
                    .Where(sp => sp.StudentId == cu.UserId && sp.CohortId == cohortId)
                    .FirstOrDefault(),
                TasksDone = db.TaskCompletions.Count(tc => tc.StudentId == cu.UserId && tc.CohortId == cohortId),
                Submissions = db.Submissions.Count(s => s.StudentId == cu.UserId && s.CohortId == cohortId),
            })
            .ToListAsync();

        // A student is at risk when they have no activity in the last 2 days
        // or are more than one week behind the cohort calendar.
        var totalWeeks = Math.Max(await db.Weeks.CountAsync(w => w.CohortId == cohortId && w.IsPublished), 1);
        var dayOfJourney = Math.Clamp(
            (int)(DateTime.UtcNow.Date - cohort.StartDate.ToDateTime(TimeOnly.MinValue).Date).TotalDays + 1, 1, totalWeeks * 7);
        var expectedWeek = Math.Clamp((dayOfJourney - 1) / 7 + 1, 1, totalWeeks);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);

        var rows = students.Select(s =>
        {
            var lastActivity = s.Progress?.LastActivityDate;
            var currentWeek = s.Progress?.CurrentWeek ?? 1;
            var stale = lastActivity is null || today.DayNumber - lastActivity.Value.DayNumber > 2;
            var behind = currentWeek < expectedWeek;
            return new MentorStudentRowDto(
                s.Id, s.FirstName, s.LastName, s.Email ?? "",
                currentWeek, s.Progress?.CurrentDay ?? 1,
                s.Progress?.CurrentStreak ?? 0,
                s.TasksDone, totalTasks, s.Submissions,
                lastActivity, stale || behind);
        }).OrderBy(r => r.LastName).ToList();

        var pendingSubmissions = assignedIds is null
            ? await db.Submissions.CountAsync(s => s.CohortId == cohortId && s.Feedback == null)
            : await db.Submissions.CountAsync(s => s.CohortId == cohortId && s.Feedback == null && assignedIds.Contains(s.StudentId));
        var pendingPrayers = await db.PrayerRequests.CountAsync(pr => pr.CohortId == cohortId && pr.Status == PrayerRequestStatus.Pending);

        return Ok(new MentorDashboardDto(
            new MentorCohortSummaryDto(cohort.Id, cohort.Name, cohort.StartDate, cohort.Status.ToString(),
                rows.Count, pendingSubmissions, pendingPrayers),
            rows.Count > 0 ? (int)rows.Average(r => r.TasksCompleted) : 0,
            rows.Count(r => !r.AtRisk),
            rows.Count(r => r.AtRisk),
            rows));
    }

    // GET api/mentor/cohorts/{cohortId}/roster — mentors + students with assignments
    [HttpGet("cohorts/{cohortId:int}/roster")]
    public async Task<IActionResult> GetRoster(int cohortId)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();
        return Ok(await mentors.GetRosterAsync(cohortId));
    }

    // PUT api/mentor/cohorts/{cohortId}/students/{studentId}/mentor
    [HttpPut("cohorts/{cohortId:int}/students/{studentId}/mentor")]
    public async Task<IActionResult> AssignStudentMentor(int cohortId, string studentId, AssignStudentMentorRequest req)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();
        var error = await mentors.AssignStudentAsync(cohortId, studentId, req.MentorId);
        return error is null ? Ok(new { message = "Assignment updated." }) : BadRequest(new { error });
    }

    // POST api/mentor/cohorts/{cohortId}/auto-assign-mentors
    [HttpPost("cohorts/{cohortId:int}/auto-assign-mentors")]
    public async Task<IActionResult> AutoAssignMentors(int cohortId, AutoAssignMentorsRequest req)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();
        var mentorIds = await mentors.GetMentorIdsAsync(cohortId);
        if (mentorIds.Count == 0) return BadRequest(new { error = "Add a mentor to this cohort first." });
        var changed = await mentors.AutoAssignAsync(cohortId, req.RedistributeAll);
        return Ok(new { changed });
    }

    // GET api/mentor/cohorts/{cohortId}/submissions?pendingOnly=true
    [HttpGet("cohorts/{cohortId:int}/submissions")]
    public async Task<IActionResult> GetSubmissions(int cohortId, [FromQuery] bool pendingOnly = false)
    {
        var cohort = await GetAuthorizedCohort(cohortId);
        if (cohort is null) return Forbid();

        var assignedIds = await AssignedStudentIdsIfRestricted(cohort);

        var query = db.Submissions
            .Where(s => s.CohortId == cohortId && (!pendingOnly || s.Feedback == null));
        if (assignedIds is not null)
            query = query.Where(s => assignedIds.Contains(s.StudentId));

        var submissions = await query
            .OrderBy(s => s.Feedback == null ? 0 : 1).ThenByDescending(s => s.SubmittedAt)
            .Select(s => new ReviewSubmissionDto(
                s.Id, s.StudentId,
                s.Student.FirstName + " " + s.Student.LastName,
                s.Assignment.Week.WeekNumber,
                s.Assignment.Title,
                s.TextContent, s.FileUrl, s.FileName, s.SubmittedAt,
                s.Feedback != null ? s.Feedback.Comment : null,
                s.Feedback != null ? s.Feedback.CreatedAt : null))
            .ToListAsync();

        return Ok(submissions);
    }

    // POST api/mentor/submissions/{submissionId}/feedback
    [HttpPost("submissions/{submissionId:int}/feedback")]
    public async Task<IActionResult> LeaveFeedback(int submissionId, LeaveFeedbackRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Comment))
            return BadRequest(new { error = "Feedback comment is required." });

        var submission = await db.Submissions
            .Include(s => s.Feedback)
            .FirstOrDefaultAsync(s => s.Id == submissionId);
        if (submission is null) return NotFound();
        var feedbackCohort = await GetAuthorizedCohort(submission.CohortId);
        if (feedbackCohort is null) return Forbid();
        if (!await CanAccessStudent(feedbackCohort, submission.StudentId)) return Forbid();

        if (submission.Feedback is null)
        {
            db.SubmissionFeedbacks.Add(new SubmissionFeedback
            {
                SubmissionId = submissionId,
                MentorId = UserId,
                Comment = request.Comment.Trim(),
            });
        }
        else
        {
            submission.Feedback.Comment = request.Comment.Trim();
            submission.Feedback.MentorId = UserId;
            submission.Feedback.CreatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok();
    }

    // GET api/mentor/cohorts/{cohortId}/students/{studentId}
    [HttpGet("cohorts/{cohortId:int}/students/{studentId}")]
    public async Task<IActionResult> GetStudentProfile(int cohortId, string studentId)
    {
        var cohort = await GetAuthorizedCohort(cohortId);
        if (cohort is null) return Forbid();
        if (!await CanAccessStudent(cohort, studentId)) return Forbid();

        var enrolment = await db.CohortUsers
            .Include(cu => cu.User)
            .FirstOrDefaultAsync(cu => cu.CohortId == cohortId && cu.UserId == studentId);
        if (enrolment is null) return NotFound();

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == studentId && sp.CohortId == cohortId);

        var weeks = await db.Weeks
            .Where(w => w.CohortId == cohortId)
            .OrderBy(w => w.WeekNumber)
            .Include(w => w.Days).ThenInclude(d => d.Tasks)
            .Include(w => w.Assignments)
            .ToListAsync();

        var completedTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == studentId && tc.CohortId == cohortId)
            .Select(tc => tc.TaskId).ToHashSetAsync();

        var submissions = await db.Submissions
            .Where(s => s.StudentId == studentId && s.CohortId == cohortId)
            .Include(s => s.Feedback)
            .Include(s => s.Assignment).ThenInclude(a => a.Week)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        var unlocks = await db.WeekUnlocks
            .Where(wu => wu.StudentId == studentId && wu.CohortId == cohortId)
            .Select(wu => wu.WeekNumber).ToHashSetAsync();

        var submittedAssignmentIds = submissions.Select(s => s.AssignmentId).ToHashSet();

        var weekDtos = weeks.Select(w =>
        {
            var tasks = w.Days.SelectMany(d => d.Tasks).ToList();
            var assignment = w.Assignments.FirstOrDefault();
            return new ProfileWeekDto(
                w.WeekNumber, w.Title,
                w.Days.Count(d => d.Tasks.Any() && d.Tasks.All(t => completedTaskIds.Contains(t.Id))),
                tasks.Count(t => completedTaskIds.Contains(t.Id)),
                tasks.Count,
                assignment is not null && submittedAssignmentIds.Contains(assignment.Id),
                assignment is not null,
                unlocks.Contains(w.WeekNumber));
        }).ToList();

        var submissionDtos = submissions.Select(s => new ProfileSubmissionDto(
            s.Id, s.Assignment.Week.WeekNumber, s.Assignment.Title,
            s.TextContent, s.SubmittedAt, s.Feedback?.Comment)).ToList();

        return Ok(new MentorStudentProfileDto(
            enrolment.UserId,
            enrolment.User.FirstName, enrolment.User.LastName, enrolment.User.Email ?? "",
            progress?.CurrentWeek ?? 1, progress?.CurrentDay ?? 1,
            progress?.CurrentStreak ?? 0, progress?.LongestStreak ?? 0,
            progress?.LastActivityDate, enrolment.EnrolledAt,
            weekDtos, submissionDtos));
    }

    // POST api/mentor/cohorts/{cohortId}/unlock
    [HttpPost("cohorts/{cohortId:int}/unlock")]
    public async Task<IActionResult> UnlockWeek(int cohortId, UnlockWeekRequest request)
    {
        var cohort = await GetAuthorizedCohort(cohortId);
        if (cohort is null) return Forbid();
        if (!await CanAccessStudent(cohort, request.StudentId)) return Forbid();

        var maxWeek = await db.Weeks
            .Where(w => w.CohortId == cohortId && w.IsPublished)
            .MaxAsync(w => (int?)w.WeekNumber) ?? 0;
        if (request.WeekNumber < 2 || request.WeekNumber > maxWeek)
            return BadRequest(new { error = $"Only weeks 2–{Math.Max(maxWeek, 2)} can be manually unlocked." });

        var enrolled = await db.CohortUsers.AnyAsync(cu =>
            cu.CohortId == cohortId && cu.UserId == request.StudentId && cu.Role == CohortRole.Student);
        if (!enrolled) return NotFound(new { error = "Student is not enrolled in this cohort." });

        var exists = await db.WeekUnlocks.AnyAsync(wu =>
            wu.CohortId == cohortId && wu.StudentId == request.StudentId && wu.WeekNumber == request.WeekNumber);
        if (exists) return Conflict(new { error = "Week is already unlocked for this student." });

        db.WeekUnlocks.Add(new WeekUnlock
        {
            CohortId = cohortId,
            StudentId = request.StudentId,
            WeekNumber = request.WeekNumber,
            UnlockedByUserId = UserId,
        });
        await db.SaveChangesAsync();
        return Ok();
    }

    // POST api/mentor/cohorts/{cohortId}/announcements
    [HttpPost("cohorts/{cohortId:int}/announcements")]
    public async Task<IActionResult> CreateAnnouncement(int cohortId, CreateAnnouncementRequest request)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Title and content are required." });

        var announcement = new Announcement
        {
            CohortId = cohortId,
            AuthorId = UserId,
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
        };
        db.Announcements.Add(announcement);
        await db.SaveChangesAsync();
        return Ok(new { announcement.Id });
    }

    // GET api/mentor/cohorts/{cohortId}/announcements
    [HttpGet("cohorts/{cohortId:int}/announcements")]
    public async Task<IActionResult> GetAnnouncements(int cohortId)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();

        var list = await db.Announcements
            .Where(a => a.CohortId == cohortId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Content,
                a.Author.FirstName + " " + a.Author.LastName, a.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    // DELETE api/mentor/cohorts/{cohortId}/announcements/{id} — retract a posted
    // announcement so it disappears from students' feeds. Author or admin only.
    [HttpDelete("cohorts/{cohortId:int}/announcements/{id:int}")]
    public async Task<IActionResult> DeleteAnnouncement(int cohortId, int id)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();

        var announcement = await db.Announcements
            .FirstOrDefaultAsync(a => a.Id == id && a.CohortId == cohortId);
        if (announcement is null) return NotFound();
        if (!User.IsInRole("Admin") && announcement.AuthorId != UserId) return Forbid();

        db.Announcements.Remove(announcement);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/mentor/cohorts/{cohortId}/sessions
    [HttpPost("cohorts/{cohortId:int}/sessions")]
    public async Task<IActionResult> AddSession(int cohortId, AddSessionRequest request)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.VideoUrl))
            return BadRequest(new { error = "Title and video URL are required." });
        if (!Uri.TryCreate(request.VideoUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != "https" && uri.Scheme != "http"))
            return BadRequest(new { error = "Video URL must be a valid http(s) link." });

        var week = await db.Weeks.FirstOrDefaultAsync(w =>
            w.CohortId == cohortId && w.WeekNumber == request.WeekNumber);
        if (week is null) return NotFound(new { error = "Week not found." });

        var session = new Session
        {
            WeekId = week.Id,
            Title = request.Title.Trim(),
            VideoUrl = request.VideoUrl.Trim(),
            Description = request.Description?.Trim(),
            AddedByUserId = UserId,
        };
        db.Sessions.Add(session);
        await db.SaveChangesAsync();
        return Ok(new { session.Id });
    }

    // GET api/mentor/cohorts/{cohortId}/prayer-requests?status=Pending
    [HttpGet("cohorts/{cohortId:int}/prayer-requests")]
    public async Task<IActionResult> GetPrayerRequests(int cohortId, [FromQuery] string? status = null)
    {
        if (await GetAuthorizedCohort(cohortId) is null) return Forbid();

        PrayerRequestStatus? filter = status is null ? null
            : Enum.TryParse<PrayerRequestStatus>(status, true, out var parsed) ? parsed : null;

        var list = await db.PrayerRequests
            .Where(pr => pr.CohortId == cohortId && (filter == null || pr.Status == filter))
            .OrderBy(pr => pr.Status).ThenByDescending(pr => pr.CreatedAt)
            .Select(pr => new PrayerRequestDto(
                pr.Id, pr.Author.FirstName + " " + pr.Author.LastName,
                pr.Content, pr.Status.ToString(), pr.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    // POST api/mentor/prayer-requests/{id}/approve | /reject
    [HttpPost("prayer-requests/{id:int}/approve")]
    public Task<IActionResult> ApprovePrayer(int id) => Moderate(id, PrayerRequestStatus.Approved);

    [HttpPost("prayer-requests/{id:int}/reject")]
    public Task<IActionResult> RejectPrayer(int id) => Moderate(id, PrayerRequestStatus.Rejected);

    // Disapprove an already-decided request, returning it to the moderation queue.
    [HttpPost("prayer-requests/{id:int}/unapprove")]
    public Task<IActionResult> UnapprovePrayer(int id) => Moderate(id, PrayerRequestStatus.Pending);

    private async Task<IActionResult> Moderate(int id, PrayerRequestStatus status)
    {
        var pr = await db.PrayerRequests.FindAsync(id);
        if (pr is null) return NotFound();
        if (await GetAuthorizedCohort(pr.CohortId) is null) return Forbid();

        pr.Status = status;
        pr.ModeratedAt = DateTime.UtcNow;
        pr.ModeratedByUserId = UserId;
        await db.SaveChangesAsync();
        return Ok();
    }
}
