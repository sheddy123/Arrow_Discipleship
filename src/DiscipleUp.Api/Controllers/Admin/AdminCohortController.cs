using DiscipleUp.Api.Models;
using DiscipleUp.Api.Services;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminCohortController(AppDbContext db, UserManager<ApplicationUser> userManager, CohortMentorService mentors) : ControllerBase
{
    // ── Cohorts ───────────────────────────────────────────────────────────────

    [HttpGet("cohorts")]
    public async Task<IActionResult> ListCohorts(CancellationToken ct)
    {
        var cohorts = await db.Cohorts
            .Include(c => c.Mentor)
            .Include(c => c.Weeks)
            .Include(c => c.CohortUsers)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        var result = cohorts.Select(c => new CohortSummaryDto(
            c.Id, c.Name, c.StartDate, c.LateEntryWindowDays,
            c.MentorId, $"{c.Mentor.FirstName} {c.Mentor.LastName}",
            c.IsPaid, c.Status,
            c.Weeks.Count,
            c.CohortUsers.Count(cu => cu.Role == CohortRole.Student)));

        return Ok(result);
    }

    [HttpPost("cohorts")]
    public async Task<IActionResult> CreateCohort([FromBody] CreateCohortRequest req, CancellationToken ct)
    {
        var mentor = await userManager.FindByIdAsync(req.MentorId);
        if (mentor is null) return BadRequest(new { error = "Mentor not found." });

        var cohort = new Cohort
        {
            Name = req.Name,
            StartDate = req.StartDate,
            MentorId = req.MentorId,
            LateEntryWindowDays = req.LateEntryWindowDays,
            IsPaid = req.IsPaid,
            Status = CohortStatus.Draft
        };
        db.Cohorts.Add(cohort);
        await db.SaveChangesAsync(ct);

        // Scaffold the requested number of weeks, each with 7 empty days (admin fills content later)
        for (var i = 1; i <= req.WeekCount; i++)
        {
            var week = new Week
            {
                CohortId = cohort.Id,
                WeekNumber = i,
                Title = $"Week {i}",
                IsPublished = false
            };
            for (var d = 1; d <= 7; d++)
                week.Days.Add(new Day { DayNumber = d, Title = $"Day {d}" });
            db.Weeks.Add(week);
        }

        // Add the mentor as a CohortUser
        db.CohortUsers.Add(new CohortUser { CohortId = cohort.Id, UserId = req.MentorId, Role = CohortRole.Mentor });
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetCohort), new { id = cohort.Id },
            new { cohort.Id, cohort.Name, cohort.Status });
    }

    [HttpGet("cohorts/{id:int}")]
    public async Task<IActionResult> GetCohort(int id, CancellationToken ct)
    {
        var cohort = await db.Cohorts
            .Include(c => c.Mentor)
            .Include(c => c.Weeks.OrderBy(w => w.WeekNumber))
                .ThenInclude(w => w.Days.OrderBy(d => d.DayNumber))
                    .ThenInclude(d => d.Tasks.OrderBy(t => t.OrderIndex))
            .Include(c => c.Weeks)
                .ThenInclude(w => w.Assignments)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (cohort is null) return NotFound();

        return Ok(MapCohortDetail(cohort));
    }

    [HttpPut("cohorts/{id:int}")]
    public async Task<IActionResult> UpdateCohort(int id, [FromBody] UpdateCohortRequest req, CancellationToken ct)
    {
        var cohort = await db.Cohorts.FindAsync([id], ct);
        if (cohort is null) return NotFound();

        if (req.Name is not null) cohort.Name = req.Name;
        if (req.StartDate is not null) cohort.StartDate = req.StartDate.Value;
        if (req.MentorId is not null)
        {
            var mentor = await userManager.FindByIdAsync(req.MentorId);
            if (mentor is null) return BadRequest(new { error = "Mentor not found." });
            cohort.MentorId = req.MentorId;
        }
        if (req.LateEntryWindowDays is not null) cohort.LateEntryWindowDays = req.LateEntryWindowDays.Value;
        if (req.IsPaid is not null) cohort.IsPaid = req.IsPaid.Value;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("cohorts/{id:int}/publish")]
    public async Task<IActionResult> PublishCohort(int id, CancellationToken ct)
    {
        var cohort = await db.Cohorts
            .Include(c => c.Weeks)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (cohort is null) return NotFound();
        if (cohort.Status != CohortStatus.Draft)
            return BadRequest(new { error = "Only a Draft cohort can be published." });
        if (!cohort.Weeks.Any())
            return BadRequest(new { error = "A cohort must have at least one week before publishing." });

        cohort.Status = CohortStatus.Published;
        foreach (var week in cohort.Weeks) week.IsPublished = true;

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Cohort published." });
    }

    [HttpPost("cohorts/{id:int}/unpublish")]
    public async Task<IActionResult> UnpublishCohort(int id, CancellationToken ct)
    {
        var cohort = await db.Cohorts
            .Include(c => c.Weeks)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (cohort is null) return NotFound();
        if (cohort.Status == CohortStatus.Draft)
            return BadRequest(new { error = "Cohort is already a Draft." });

        cohort.Status = CohortStatus.Draft;
        foreach (var week in cohort.Weeks) week.IsPublished = false;

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Cohort reverted to Draft." });
    }

    [HttpDelete("cohorts/{id:int}")]
    public async Task<IActionResult> DeleteCohort(int id, CancellationToken ct)
    {
        if (!await db.Cohorts.AnyAsync(c => c.Id == id, ct)) return NotFound();

        // Gather child ids so we can delete dependents before their parents (FKs are Restrict)
        var weekIds = await db.Weeks.Where(w => w.CohortId == id).Select(w => w.Id).ToListAsync(ct);
        var dayIds = await db.Days.Where(d => weekIds.Contains(d.WeekId)).Select(d => d.Id).ToListAsync(ct);
        var submissionIds = await db.Submissions.Where(s => s.CohortId == id).Select(s => s.Id).ToListAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Student activity first
        await db.SubmissionFeedbacks.Where(sf => submissionIds.Contains(sf.SubmissionId)).ExecuteDeleteAsync(ct);
        await db.Submissions.Where(s => s.CohortId == id).ExecuteDeleteAsync(ct);
        await db.TaskCompletions.Where(tc => tc.CohortId == id).ExecuteDeleteAsync(ct);
        await db.WeekUnlocks.Where(wu => wu.CohortId == id).ExecuteDeleteAsync(ct);
        await db.PrayerRequests.Where(pr => pr.CohortId == id).ExecuteDeleteAsync(ct);
        await db.StudentProgresses.Where(sp => sp.CohortId == id).ExecuteDeleteAsync(ct);
        await db.Announcements.Where(a => a.CohortId == id).ExecuteDeleteAsync(ct);
        await db.ScriptureMemories.Where(sm => weekIds.Contains(sm.WeekId)).ExecuteDeleteAsync(ct);

        // Then the content graph
        await db.Tasks.Where(t => dayIds.Contains(t.DayId)).ExecuteDeleteAsync(ct);
        await db.Sessions.Where(se => weekIds.Contains(se.WeekId)).ExecuteDeleteAsync(ct);
        await db.Assignments.Where(asg => weekIds.Contains(asg.WeekId)).ExecuteDeleteAsync(ct);
        await db.Days.Where(d => weekIds.Contains(d.WeekId)).ExecuteDeleteAsync(ct);
        await db.Weeks.Where(w => w.CohortId == id).ExecuteDeleteAsync(ct);
        await db.CohortUsers.Where(cu => cu.CohortId == id).ExecuteDeleteAsync(ct);
        await db.Cohorts.Where(c => c.Id == id).ExecuteDeleteAsync(ct);

        await tx.CommitAsync(ct);
        return NoContent();
    }

    // ── Weeks ─────────────────────────────────────────────────────────────────

    [HttpPost("cohorts/{cohortId:int}/weeks")]
    public async Task<IActionResult> AddWeek(int cohortId, [FromBody] CreateWeekRequest req, CancellationToken ct)
    {
        var cohort = await db.Cohorts.Include(c => c.Weeks).FirstOrDefaultAsync(c => c.Id == cohortId, ct);
        if (cohort is null) return NotFound();
        if (cohort.Weeks.Count >= 52)
            return BadRequest(new { error = "A cohort cannot have more than 52 weeks." });

        var week = new Week
        {
            CohortId = cohortId,
            WeekNumber = cohort.Weeks.Count + 1,
            Title = req.Title,
            Description = req.Description,
            IsPublished = cohort.Status != CohortStatus.Draft
        };
        // Give the new week 7 empty days so it's ready to edit right away
        for (var d = 1; d <= 7; d++)
            week.Days.Add(new Day { DayNumber = d, Title = $"Day {d}" });
        db.Weeks.Add(week);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetCohort), new { id = cohortId }, new { week.Id, week.WeekNumber, week.Title });
    }

    [HttpDelete("cohorts/{cohortId:int}/weeks/{weekId:int}")]
    public async Task<IActionResult> DeleteWeek(int cohortId, int weekId, CancellationToken ct)
    {
        var week = await db.Weeks.FirstOrDefaultAsync(w => w.Id == weekId && w.CohortId == cohortId, ct);
        if (week is null) return NotFound();

        var weekNumber = week.WeekNumber;
        var dayIds = await db.Days.Where(d => d.WeekId == weekId).Select(d => d.Id).ToListAsync(ct);
        var taskIds = await db.Tasks.Where(t => dayIds.Contains(t.DayId)).Select(t => t.Id).ToListAsync(ct);
        var assignmentIds = await db.Assignments.Where(a => a.WeekId == weekId).Select(a => a.Id).ToListAsync(ct);
        var submissionIds = await db.Submissions.Where(s => assignmentIds.Contains(s.AssignmentId)).Select(s => s.Id).ToListAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Student activity tied to this week first
        await db.SubmissionFeedbacks.Where(sf => submissionIds.Contains(sf.SubmissionId)).ExecuteDeleteAsync(ct);
        await db.Submissions.Where(s => assignmentIds.Contains(s.AssignmentId)).ExecuteDeleteAsync(ct);
        await db.TaskCompletions.Where(tc => taskIds.Contains(tc.TaskId)).ExecuteDeleteAsync(ct);
        await db.ScriptureMemories.Where(sm => sm.WeekId == weekId).ExecuteDeleteAsync(ct);
        // Unlocks are keyed by week number; renumbering shifts everything at/after this week
        await db.WeekUnlocks.Where(wu => wu.CohortId == cohortId && wu.WeekNumber >= weekNumber).ExecuteDeleteAsync(ct);

        // Content graph
        await db.Tasks.Where(t => taskIds.Contains(t.Id)).ExecuteDeleteAsync(ct);
        await db.Sessions.Where(se => se.WeekId == weekId).ExecuteDeleteAsync(ct);
        await db.Assignments.Where(a => a.WeekId == weekId).ExecuteDeleteAsync(ct);
        await db.Days.Where(d => d.WeekId == weekId).ExecuteDeleteAsync(ct);
        await db.Weeks.Where(w => w.Id == weekId).ExecuteDeleteAsync(ct);

        // Keep week numbers contiguous
        await db.Weeks.Where(w => w.CohortId == cohortId && w.WeekNumber > weekNumber)
            .ExecuteUpdateAsync(s => s.SetProperty(w => w.WeekNumber, w => w.WeekNumber - 1), ct);

        await tx.CommitAsync(ct);
        return NoContent();
    }

    [HttpPut("cohorts/{cohortId:int}/weeks/{weekId:int}")]
    public async Task<IActionResult> UpdateWeek(int cohortId, int weekId, [FromBody] UpdateWeekRequest req, CancellationToken ct)
    {
        var week = await db.Weeks.FirstOrDefaultAsync(w => w.Id == weekId && w.CohortId == cohortId, ct);
        if (week is null) return NotFound();

        if (req.Title is not null) week.Title = req.Title;
        if (req.Description is not null) week.Description = req.Description;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Days ──────────────────────────────────────────────────────────────────

    [HttpPost("cohorts/{cohortId:int}/weeks/{weekId:int}/days")]
    public async Task<IActionResult> AddDay(int cohortId, int weekId, [FromBody] CreateDayRequest req, CancellationToken ct)
    {
        var week = await db.Weeks.Include(w => w.Days).FirstOrDefaultAsync(w => w.Id == weekId && w.CohortId == cohortId, ct);
        if (week is null) return NotFound();
        if (week.Days.Count >= 7)
            return BadRequest(new { error = "A week cannot have more than 7 days." });

        var day = new Day
        {
            WeekId = weekId,
            DayNumber = week.Days.Count + 1,
            Title = req.Title,
            DevotionText = req.DevotionText ?? "",
            ScriptureReference = req.ScriptureReference,
            ScriptureText = req.ScriptureText
        };
        db.Days.Add(day);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetCohort), new { id = cohortId }, new { day.Id, day.DayNumber });
    }

    [HttpPut("days/{dayId:int}")]
    public async Task<IActionResult> UpdateDay(int dayId, [FromBody] UpdateDayRequest req, CancellationToken ct)
    {
        var day = await db.Days.FindAsync([dayId], ct);
        if (day is null) return NotFound();

        if (req.Title is not null) day.Title = req.Title;
        if (req.DevotionText is not null) day.DevotionText = req.DevotionText;
        if (req.ScriptureReference is not null) day.ScriptureReference = req.ScriptureReference;
        if (req.ScriptureText is not null) day.ScriptureText = req.ScriptureText;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("days/{dayId:int}")]
    public async Task<IActionResult> DeleteDay(int dayId, CancellationToken ct)
    {
        var day = await db.Days.FirstOrDefaultAsync(d => d.Id == dayId, ct);
        if (day is null) return NotFound();

        var weekId = day.WeekId;
        var dayNumber = day.DayNumber;
        var taskIds = await db.Tasks.Where(t => t.DayId == dayId).Select(t => t.Id).ToListAsync(ct);

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        await db.TaskCompletions.Where(tc => taskIds.Contains(tc.TaskId)).ExecuteDeleteAsync(ct);
        await db.Tasks.Where(t => t.DayId == dayId).ExecuteDeleteAsync(ct);
        await db.Days.Where(d => d.Id == dayId).ExecuteDeleteAsync(ct);

        // Keep day numbers contiguous within the week
        await db.Days.Where(d => d.WeekId == weekId && d.DayNumber > dayNumber)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.DayNumber, d => d.DayNumber - 1), ct);

        await tx.CommitAsync(ct);
        return NoContent();
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────

    [HttpPost("days/{dayId:int}/tasks")]
    public async Task<IActionResult> AddTask(int dayId, [FromBody] CreateTaskRequest req, CancellationToken ct)
    {
        var day = await db.Days.FindAsync([dayId], ct);
        if (day is null) return NotFound();

        var task = new DiscipleTask
        {
            DayId = dayId,
            Title = req.Title,
            Description = req.Description,
            OrderIndex = req.OrderIndex
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return Ok(new { task.Id, task.Title });
    }

    [HttpPut("tasks/{taskId:int}")]
    public async Task<IActionResult> UpdateTask(int taskId, [FromBody] UpdateTaskRequest req, CancellationToken ct)
    {
        var task = await db.Tasks.FindAsync([taskId], ct);
        if (task is null) return NotFound();

        if (req.Title is not null) task.Title = req.Title;
        if (req.Description is not null) task.Description = req.Description;
        if (req.OrderIndex is not null) task.OrderIndex = req.OrderIndex.Value;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("tasks/{taskId:int}")]
    public async Task<IActionResult> DeleteTask(int taskId, CancellationToken ct)
    {
        var task = await db.Tasks.FindAsync([taskId], ct);
        if (task is null) return NotFound();

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Assignments ───────────────────────────────────────────────────────────

    [HttpPost("cohorts/{cohortId:int}/weeks/{weekId:int}/assignments")]
    public async Task<IActionResult> AddAssignment(int cohortId, int weekId, [FromBody] CreateAssignmentRequest req, CancellationToken ct)
    {
        var week = await db.Weeks.FirstOrDefaultAsync(w => w.Id == weekId && w.CohortId == cohortId, ct);
        if (week is null) return NotFound();

        var assignment = new Assignment
        {
            WeekId = weekId,
            Title = req.Title,
            Description = req.Description,
            AllowsFileUpload = req.AllowsFileUpload
        };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);
        return Ok(new { assignment.Id, assignment.Title });
    }

    [HttpPut("assignments/{assignmentId:int}")]
    public async Task<IActionResult> UpdateAssignment(int assignmentId, [FromBody] UpdateAssignmentRequest req, CancellationToken ct)
    {
        var assignment = await db.Assignments.FindAsync([assignmentId], ct);
        if (assignment is null) return NotFound();

        if (req.Title is not null) assignment.Title = req.Title;
        if (req.Description is not null) assignment.Description = req.Description;
        if (req.AllowsFileUpload is not null) assignment.AllowsFileUpload = req.AllowsFileUpload.Value;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Enrolment ─────────────────────────────────────────────────────────────

    [HttpPost("cohorts/{cohortId:int}/enrol")]
    public async Task<IActionResult> EnrolStudent(int cohortId, [FromBody] EnrolStudentRequest req, CancellationToken ct)
    {
        var cohort = await db.Cohorts.Include(c => c.CohortUsers).FirstOrDefaultAsync(c => c.Id == cohortId, ct);
        if (cohort is null) return NotFound();

        var student = await userManager.FindByIdAsync(req.StudentId);
        if (student is null) return BadRequest(new { error = "Student not found." });

        // Check not already enrolled in another active cohort
        var alreadyEnrolled = await db.CohortUsers
            .AnyAsync(cu => cu.UserId == req.StudentId && cu.Role == CohortRole.Student, ct);
        if (alreadyEnrolled)
            return BadRequest(new { error = "Student is already enrolled in a cohort." });

        if (cohort.CohortUsers.Any(cu => cu.UserId == req.StudentId))
            return BadRequest(new { error = "Student is already enrolled in this cohort." });

        db.CohortUsers.Add(new CohortUser { CohortId = cohortId, UserId = req.StudentId, Role = CohortRole.Student });
        db.StudentProgresses.Add(new StudentProgress { StudentId = req.StudentId, CohortId = cohortId });
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Student enrolled." });
    }

    // Move a student to a different cohort. They keep access to their current
    // cohort until this runs; the move starts them fresh in the new cohort.
    [HttpPost("students/{studentId}/move")]
    public async Task<IActionResult> MoveStudent(string studentId, [FromBody] MoveStudentRequest req, CancellationToken ct)
    {
        var target = await db.Cohorts.FindAsync([req.CohortId], ct);
        if (target is null) return NotFound(new { error = "Target cohort not found." });

        var student = await userManager.FindByIdAsync(studentId);
        if (student is null) return BadRequest(new { error = "Student not found." });

        var alreadyThere = await db.CohortUsers.AnyAsync(
            cu => cu.CohortId == req.CohortId && cu.UserId == studentId && cu.Role == CohortRole.Student, ct);
        if (alreadyThere) return BadRequest(new { error = "Student is already in that cohort." });

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Remove current student enrolment + progress from any other cohort.
        await db.CohortUsers
            .Where(cu => cu.UserId == studentId && cu.Role == CohortRole.Student)
            .ExecuteDeleteAsync(ct);
        await db.StudentProgresses
            .Where(sp => sp.StudentId == studentId)
            .ExecuteDeleteAsync(ct);

        db.CohortUsers.Add(new CohortUser { CohortId = req.CohortId, UserId = studentId, Role = CohortRole.Student });
        db.StudentProgresses.Add(new StudentProgress { StudentId = studentId, CohortId = req.CohortId });
        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);
        return Ok(new { message = "Student moved." });
    }

    // ── Mentors & assignment ──────────────────────────────────────────────────

    [HttpGet("cohorts/{cohortId:int}/roster")]
    public async Task<IActionResult> GetRoster(int cohortId, CancellationToken ct)
    {
        if (!await db.Cohorts.AnyAsync(c => c.Id == cohortId, ct)) return NotFound();
        return Ok(await mentors.GetRosterAsync(cohortId, ct));
    }

    [HttpPost("cohorts/{cohortId:int}/mentors")]
    public async Task<IActionResult> AddCohortMentor(int cohortId, [FromBody] AddCohortMentorRequest req, CancellationToken ct)
    {
        if (!await db.Cohorts.AnyAsync(c => c.Id == cohortId, ct)) return NotFound();
        var error = await mentors.AddMentorAsync(cohortId, req.MentorId, ct);
        return error is null ? Ok(new { message = "Mentor added." }) : BadRequest(new { error });
    }

    [HttpDelete("cohorts/{cohortId:int}/mentors/{mentorId}")]
    public async Task<IActionResult> RemoveCohortMentor(int cohortId, string mentorId, CancellationToken ct)
    {
        if (!await db.Cohorts.AnyAsync(c => c.Id == cohortId, ct)) return NotFound();
        var error = await mentors.RemoveMentorAsync(cohortId, mentorId, ct);
        return error is null ? NoContent() : BadRequest(new { error });
    }

    [HttpPut("cohorts/{cohortId:int}/students/{studentId}/mentor")]
    public async Task<IActionResult> AssignStudentMentor(int cohortId, string studentId, [FromBody] AssignStudentMentorRequest req, CancellationToken ct)
    {
        var error = await mentors.AssignStudentAsync(cohortId, studentId, req.MentorId, ct);
        return error is null ? Ok(new { message = "Assignment updated." }) : BadRequest(new { error });
    }

    [HttpPost("cohorts/{cohortId:int}/auto-assign-mentors")]
    public async Task<IActionResult> AutoAssignMentors(int cohortId, [FromBody] AutoAssignMentorsRequest req, CancellationToken ct)
    {
        if (!await db.Cohorts.AnyAsync(c => c.Id == cohortId, ct)) return NotFound();
        var mentorIds = await mentors.GetMentorIdsAsync(cohortId, ct);
        if (mentorIds.Count == 0) return BadRequest(new { error = "Add at least one mentor to this cohort first." });
        var changed = await mentors.AutoAssignAsync(cohortId, req.RedistributeAll, ct);
        return Ok(new { changed });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CohortDetailDto MapCohortDetail(Cohort c) => new(
        c.Id, c.Name, c.StartDate, c.LateEntryWindowDays,
        c.MentorId, $"{c.Mentor.FirstName} {c.Mentor.LastName}",
        c.IsPaid, c.Status,
        c.Weeks.OrderBy(w => w.WeekNumber).Select(w => new WeekDto(
            w.Id, w.WeekNumber, w.Title, w.Description, w.IsPublished,
            w.Days.OrderBy(d => d.DayNumber).Select(d => new DayDto(
                d.Id, d.DayNumber, d.Title, d.DevotionText,
                d.ScriptureReference, d.ScriptureText,
                d.Tasks.OrderBy(t => t.OrderIndex).Select(t => new TaskDto(t.Id, t.Title, t.Description, t.OrderIndex)))),
            w.Assignments.Select(a => new AssignmentDto(a.Id, a.Title, a.Description, a.AllowsFileUpload)))));
}
