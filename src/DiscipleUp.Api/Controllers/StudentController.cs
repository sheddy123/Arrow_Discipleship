using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize(Roles = "Student,Mentor,Parent,Admin")]
public class StudentController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET api/students/me/dashboard
    [HttpGet("me/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = UserId;

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId);

        DashboardCohortDto? cohortDto = null;
        List<DashboardTaskDto> todaysTasks = [];

        if (progress is not null)
        {
            var cohort = await db.Cohorts.FindAsync(progress.CohortId);

            if (cohort is not null)
            {
                var dayOfJourney = (int)(DateTime.UtcNow.Date - cohort.StartDate.ToDateTime(TimeOnly.MinValue).Date).TotalDays + 1;
                cohortDto = new DashboardCohortDto(
                    cohort.Id, cohort.Name, cohort.StartDate,
                    progress.CurrentWeek, progress.CurrentDay,
                    Math.Clamp(dayOfJourney, 1, 28));

                // Today's tasks = tasks for current day in current week
                var todayDay = await db.Days
                    .Where(d => d.Week.CohortId == cohort.Id
                             && d.Week.WeekNumber == progress.CurrentWeek
                             && d.DayNumber == progress.CurrentDay)
                    .Include(d => d.Tasks)
                    .FirstOrDefaultAsync();

                if (todayDay is not null)
                {
                    var completedTaskIds = await db.TaskCompletions
                        .Where(tc => tc.StudentId == userId && tc.CohortId == cohort.Id)
                        .Select(tc => tc.TaskId)
                        .ToHashSetAsync();

                    todaysTasks = todayDay.Tasks
                        .OrderBy(t => t.OrderIndex)
                        .Select(t => new DashboardTaskDto(t.Id, t.Title, completedTaskIds.Contains(t.Id)))
                        .ToList();
                }
            }
        }

        var recentBadges = await db.StudentBadges
            .Where(sb => sb.StudentId == userId)
            .OrderByDescending(sb => sb.EarnedAt)
            .Take(3)
            .Select(sb => new DashboardBadgeDto(sb.Badge.Name, sb.Badge.IconUrl, sb.EarnedAt))
            .ToListAsync();

        return Ok(new DashboardDto(
            progress?.CurrentStreak ?? 0,
            progress?.LongestStreak ?? 0,
            progress?.TotalTasksCompleted ?? 0,
            cohortDto,
            todaysTasks,
            recentBadges
        ));
    }

    // GET api/students/me/journey
    [HttpGet("me/journey")]
    public async Task<IActionResult> GetJourney()
    {
        var userId = UserId;

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId);

        if (progress is null)
            return Ok(new { enrolled = false });

        var cohort = await db.Cohorts.FindAsync(progress.CohortId);
        if (cohort is null) return NotFound();

        var weeks = await db.Weeks
            .Where(w => w.CohortId == cohort.Id && w.IsPublished)
            .OrderBy(w => w.WeekNumber)
            .Include(w => w.Days).ThenInclude(d => d.Tasks)
            .Include(w => w.Assignments)
            .ToListAsync();

        var completedTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == userId && tc.CohortId == cohort.Id)
            .Select(tc => tc.TaskId)
            .ToHashSetAsync();

        var submittedAssignmentIds = await db.Submissions
            .Where(s => s.StudentId == userId && s.CohortId == cohort.Id)
            .Select(s => s.AssignmentId)
            .ToHashSetAsync();

        var unlocks = await db.WeekUnlocks
            .Where(wu => wu.StudentId == userId && wu.CohortId == cohort.Id)
            .Select(wu => wu.WeekNumber)
            .ToHashSetAsync();

        var weekDtos = weeks.Select(w =>
        {
            var allTaskIds = w.Days.SelectMany(d => d.Tasks).Select(t => t.Id).ToList();
            var daysCompleted = w.Days.Count(d => d.Tasks.All(t => completedTaskIds.Contains(t.Id)) && d.Tasks.Any());
            var assignment = w.Assignments.FirstOrDefault();
            var assignmentSubmitted = assignment is not null && submittedAssignmentIds.Contains(assignment.Id);

            bool allTasksDone = allTaskIds.Count > 0 && allTaskIds.All(id => completedTaskIds.Contains(id));
            bool weekComplete = allTasksDone && (assignment is null || assignmentSubmitted);

            WeekProgressStatus status;
            if (weekComplete)
                status = WeekProgressStatus.Completed;
            else if (w.WeekNumber == 1 || w.WeekNumber <= progress.CurrentWeek || unlocks.Contains(w.WeekNumber))
                status = WeekProgressStatus.InProgress;
            else
                status = WeekProgressStatus.Locked;

            return new WeekStatusDto(
                w.Id, w.WeekNumber, w.Title, w.Description,
                status, daysCompleted,
                assignment is not null, assignmentSubmitted);
        }).ToList();

        return Ok(new JourneyDto(cohort.Id, cohort.Name, progress.CurrentWeek, progress.CurrentDay, weekDtos));
    }
}
