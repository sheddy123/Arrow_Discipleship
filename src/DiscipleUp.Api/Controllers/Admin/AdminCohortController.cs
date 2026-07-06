using DiscipleUp.Api.Models;
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
public class AdminCohortController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
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

    // ── Weeks ─────────────────────────────────────────────────────────────────

    [HttpPost("cohorts/{cohortId:int}/weeks")]
    public async Task<IActionResult> AddWeek(int cohortId, [FromBody] CreateWeekRequest req, CancellationToken ct)
    {
        var cohort = await db.Cohorts.Include(c => c.Weeks).FirstOrDefaultAsync(c => c.Id == cohortId, ct);
        if (cohort is null) return NotFound();
        if (cohort.Weeks.Count >= 4)
            return BadRequest(new { error = "A cohort cannot have more than 4 weeks." });

        var week = new Week
        {
            CohortId = cohortId,
            WeekNumber = cohort.Weeks.Count + 1,
            Title = req.Title,
            Description = req.Description,
            IsPublished = false
        };
        db.Weeks.Add(week);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetCohort), new { id = cohortId }, new { week.Id, week.WeekNumber, week.Title });
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
            DevotionText = req.DevotionText,
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
