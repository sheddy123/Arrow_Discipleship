using DiscipleUp.Api.Filters;
using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/cohorts/{cohortId:int}")]
[Authorize(Roles = "Student,Mentor,Admin")]
public class CohortContentController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> IsEnrolledAsync(string userId, int cohortId) =>
        await db.CohortUsers.AnyAsync(cu => cu.UserId == userId && cu.CohortId == cohortId);

    // GET api/cohorts/{cohortId}/weeks/{weekNumber}
    [HttpGet("weeks/{weekNumber:int}")]
    [WeekGate]
    public async Task<IActionResult> GetWeek(int cohortId, int weekNumber)
    {
        var userId = UserId;
        if (!await IsEnrolledAsync(userId, cohortId))
            return Forbid();

        var week = await db.Weeks
            .Where(w => w.CohortId == cohortId && w.WeekNumber == weekNumber && w.IsPublished)
            .Include(w => w.Days.OrderBy(d => d.DayNumber))
                .ThenInclude(d => d.Tasks.OrderBy(t => t.OrderIndex))
            .Include(w => w.Assignments)
            .Include(w => w.Sessions)
            .FirstOrDefaultAsync();

        if (week is null) return NotFound();

        var completedTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == userId && tc.CohortId == cohortId)
            .Select(tc => tc.TaskId)
            .ToHashSetAsync();

        var assignment = week.Assignments.FirstOrDefault();
        StudentSubmissionDto? submission = null;

        if (assignment is not null)
        {
            var sub = await db.Submissions
                .Where(s => s.StudentId == userId && s.AssignmentId == assignment.Id && s.CohortId == cohortId)
                .Include(s => s.Feedback)
                .FirstOrDefaultAsync();

            if (sub is not null)
            {
                submission = new StudentSubmissionDto(
                    sub.Id, sub.TextContent, sub.FileUrl, sub.FileName, sub.SubmittedAt,
                    sub.Feedback?.Comment);
            }
        }

        var scriptureMemorized = await db.ScriptureMemories
            .AnyAsync(sm => sm.StudentId == userId && sm.WeekId == week.Id);

        var days = week.Days.Select(d => new DayContentDto(
            d.Id, d.DayNumber, d.Title, d.DevotionText,
            d.ScriptureReference, d.ScriptureText,
            d.Tasks.Select(t => new StudentTaskDto(t.Id, t.Title, t.Description, t.OrderIndex, completedTaskIds.Contains(t.Id))),
            d.Tasks.Any() && d.Tasks.All(t => completedTaskIds.Contains(t.Id))
        ));

        return Ok(new WeekContentDto(
            week.Id, week.WeekNumber, week.Title, days,
            assignment is null ? null : new StudentAssignmentDto(assignment.Id, assignment.Title, assignment.Description, assignment.AllowsFileUpload),
            submission, scriptureMemorized,
            week.Sessions.Select(s => new StudentSessionDto(s.Id, s.Title, s.VideoUrl, s.Description))
        ));
    }

    // POST api/cohorts/{cohortId}/tasks/{taskId}/complete
    [HttpPost("tasks/{taskId:int}/complete")]
    public async Task<IActionResult> CompleteTask(int cohortId, int taskId)
    {
        var userId = UserId;
        if (!await IsEnrolledAsync(userId, cohortId))
            return Forbid();

        // Verify the task belongs to this cohort
        var task = await db.Tasks
            .Where(t => t.Id == taskId && t.Day.Week.CohortId == cohortId)
            .Include(t => t.Day).ThenInclude(d => d.Tasks)
            .Include(t => t.Day).ThenInclude(d => d.Week)
            .FirstOrDefaultAsync();

        if (task is null) return NotFound();

        var alreadyDone = await db.TaskCompletions.AnyAsync(tc =>
            tc.StudentId == userId && tc.TaskId == taskId && tc.CohortId == cohortId);

        if (!alreadyDone)
        {
            db.TaskCompletions.Add(new TaskCompletion
            {
                StudentId = userId,
                TaskId = taskId,
                CohortId = cohortId,
                CompletedAt = DateTime.UtcNow
            });

            // Update progress counters
            var progress = await db.StudentProgresses
                .FirstOrDefaultAsync(sp => sp.StudentId == userId && sp.CohortId == cohortId);

            if (progress is not null)
            {
                progress.TotalTasksCompleted++;
                progress.LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow);

                // Streak update (basic — full Hangfire job in Sprint 5)
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (progress.LastActivityDate == today.AddDays(-1) || progress.LastActivityDate == today)
                {
                    if (progress.LastActivityDate != today)
                    {
                        progress.CurrentStreak++;
                        if (progress.CurrentStreak > progress.LongestStreak)
                            progress.LongestStreak = progress.CurrentStreak;
                    }
                }
                else
                {
                    progress.CurrentStreak = 1;
                }
                progress.LastActivityDate = today;
                progress.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
        }

        // Check if all tasks for today are complete → advance day
        var dayTaskIds = task.Day.Tasks.Select(t => t.Id).ToList();
        var completedDayTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == userId && tc.CohortId == cohortId && dayTaskIds.Contains(tc.TaskId))
            .Select(tc => tc.TaskId)
            .ToHashSetAsync();

        bool allDayTasksDone = dayTaskIds.All(id => completedDayTaskIds.Contains(id));

        // Advance student's day if this is their current day
        if (allDayTasksDone)
        {
            var progress = await db.StudentProgresses
                .FirstOrDefaultAsync(sp => sp.StudentId == userId && sp.CohortId == cohortId);

            if (progress is not null
                && progress.CurrentWeek == task.Day.Week.WeekNumber
                && progress.CurrentDay == task.Day.DayNumber)
            {
                if (progress.CurrentDay < 7)
                {
                    progress.CurrentDay++;
                }
                else
                {
                    // Move to next week if not on week 4
                    var maxWeek = await db.Weeks
                        .Where(w => w.CohortId == cohortId && w.IsPublished)
                        .MaxAsync(w => (int?)w.WeekNumber) ?? 4;

                    if (progress.CurrentWeek < maxWeek)
                    {
                        progress.CurrentWeek++;
                        progress.CurrentDay = 1;
                    }
                }
                await db.SaveChangesAsync();
            }
        }

        // Check if all week tasks done (for journey view status)
        var allWeekTaskIds = await db.Tasks
            .Where(t => t.Day.Week.CohortId == cohortId && t.Day.Week.WeekNumber == task.Day.Week.WeekNumber)
            .Select(t => t.Id)
            .ToListAsync();

        var completedWeekTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == userId && tc.CohortId == cohortId && allWeekTaskIds.Contains(tc.TaskId))
            .Select(tc => tc.TaskId)
            .ToHashSetAsync();

        bool weekComplete = allWeekTaskIds.All(id => completedWeekTaskIds.Contains(id));

        var progressNow = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId && sp.CohortId == cohortId);

        return Ok(new TaskCompleteResponse(allDayTasksDone, weekComplete, progressNow?.CurrentStreak ?? 0));
    }

    // DELETE api/cohorts/{cohortId}/tasks/{taskId}/complete
    [HttpDelete("tasks/{taskId:int}/complete")]
    public async Task<IActionResult> UncompleteTask(int cohortId, int taskId)
    {
        var userId = UserId;
        var completion = await db.TaskCompletions.FirstOrDefaultAsync(tc =>
            tc.StudentId == userId && tc.TaskId == taskId && tc.CohortId == cohortId);

        if (completion is null) return NoContent();

        db.TaskCompletions.Remove(completion);

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId && sp.CohortId == cohortId);
        if (progress is not null && progress.TotalTasksCompleted > 0)
            progress.TotalTasksCompleted--;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/cohorts/{cohortId}/assignments/{assignmentId}/submit
    [HttpPost("assignments/{assignmentId:int}/submit")]
    public async Task<IActionResult> SubmitAssignment(int cohortId, int assignmentId, [FromBody] SubmitAssignmentRequest req)
    {
        var userId = UserId;
        if (!await IsEnrolledAsync(userId, cohortId))
            return Forbid();

        var assignment = await db.Assignments
            .Where(a => a.Id == assignmentId && a.Week.CohortId == cohortId)
            .FirstOrDefaultAsync();

        if (assignment is null) return NotFound();

        // Upsert — one submission per student per assignment
        var existing = await db.Submissions.FirstOrDefaultAsync(s =>
            s.StudentId == userId && s.AssignmentId == assignmentId && s.CohortId == cohortId);

        if (existing is not null)
        {
            existing.TextContent = req.TextContent;
            existing.SubmittedAt = DateTime.UtcNow;
        }
        else
        {
            db.Submissions.Add(new Submission
            {
                StudentId = userId,
                AssignmentId = assignmentId,
                CohortId = cohortId,
                TextContent = req.TextContent,
                SubmittedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        return Ok(new { message = "Submitted successfully." });
    }

    // POST api/cohorts/{cohortId}/weeks/{weekNumber}/scripture-memory
    [HttpPost("weeks/{weekNumber:int}/scripture-memory")]
    public async Task<IActionResult> MarkScriptureMemorized(int cohortId, int weekNumber)
    {
        var userId = UserId;
        if (!await IsEnrolledAsync(userId, cohortId))
            return Forbid();

        var week = await db.Weeks
            .FirstOrDefaultAsync(w => w.CohortId == cohortId && w.WeekNumber == weekNumber);
        if (week is null) return NotFound();

        var exists = await db.ScriptureMemories.AnyAsync(sm => sm.StudentId == userId && sm.WeekId == week.Id);
        if (!exists)
        {
            db.ScriptureMemories.Add(new ScriptureMemory
            {
                StudentId = userId,
                WeekId = week.Id,
                MarkedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        return Ok(new { memorized = true });
    }

    // DELETE api/cohorts/{cohortId}/weeks/{weekNumber}/scripture-memory
    [HttpDelete("weeks/{weekNumber:int}/scripture-memory")]
    public async Task<IActionResult> UnmarkScriptureMemorized(int cohortId, int weekNumber)
    {
        var userId = UserId;
        var week = await db.Weeks
            .FirstOrDefaultAsync(w => w.CohortId == cohortId && w.WeekNumber == weekNumber);
        if (week is null) return NotFound();

        var record = await db.ScriptureMemories.FirstOrDefaultAsync(sm =>
            sm.StudentId == userId && sm.WeekId == week.Id);
        if (record is not null)
        {
            db.ScriptureMemories.Remove(record);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }
}
