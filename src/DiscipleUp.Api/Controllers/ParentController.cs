using DiscipleUp.Api.Models;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/parents")]
[Authorize(Roles = "Parent,Admin")]
public class ParentController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET api/parents/me/children
    [HttpGet("me/children")]
    public async Task<IActionResult> GetChildren()
    {
        var parentId = UserId;
        var children = await db.Users
            .Where(u => u.LinkedParentId == parentId)
            .Select(u => new ChildSummaryDto(u.Id, u.FirstName, u.LastName))
            .ToListAsync();
        return Ok(children);
    }

    // GET api/parents/children/{childId}/dashboard — read-only view of the child's progress
    [HttpGet("children/{childId}/dashboard")]
    public async Task<IActionResult> GetChildDashboard(string childId)
    {
        var child = await db.Users.FirstOrDefaultAsync(u => u.Id == childId);
        if (child is null) return NotFound();
        if (!User.IsInRole("Admin") && child.LinkedParentId != UserId) return Forbid();

        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == childId);

        string? cohortName = null;
        int totalTasks = 0;
        List<ChildWeekDto> weekDtos = [];

        if (progress is not null)
        {
            var cohort = await db.Cohorts.FindAsync(progress.CohortId);
            cohortName = cohort?.Name;

            totalTasks = await db.Tasks.CountAsync(t => t.Day.Week.CohortId == progress.CohortId);

            var weeks = await db.Weeks
                .Where(w => w.CohortId == progress.CohortId && w.IsPublished)
                .OrderBy(w => w.WeekNumber)
                .Include(w => w.Days).ThenInclude(d => d.Tasks)
                .Include(w => w.Assignments)
                .ToListAsync();

            var completedTaskIds = await db.TaskCompletions
                .Where(tc => tc.StudentId == childId && tc.CohortId == progress.CohortId)
                .Select(tc => tc.TaskId).ToHashSetAsync();

            var submittedAssignmentIds = await db.Submissions
                .Where(s => s.StudentId == childId && s.CohortId == progress.CohortId)
                .Select(s => s.AssignmentId).ToHashSetAsync();

            weekDtos = weeks.Select(w =>
            {
                var assignment = w.Assignments.FirstOrDefault();
                return new ChildWeekDto(
                    w.WeekNumber, w.Title,
                    w.Days.Count(d => d.Tasks.Any() && d.Tasks.All(t => completedTaskIds.Contains(t.Id))),
                    assignment is not null && submittedAssignmentIds.Contains(assignment.Id),
                    assignment is not null);
            }).ToList();
        }

        var earnedBadges = await db.StudentBadges
            .Where(sb => sb.StudentId == childId)
            .Select(sb => new ProfileBadgeDto(sb.Badge.Name, sb.Badge.Description, true, sb.EarnedAt))
            .ToListAsync();

        return Ok(new ChildDashboardDto(
            child.FirstName, child.LastName, cohortName,
            progress?.CurrentWeek ?? 1, progress?.CurrentDay ?? 1,
            progress?.CurrentStreak ?? 0, progress?.LongestStreak ?? 0,
            progress?.TotalTasksCompleted ?? 0, totalTasks,
            earnedBadges, weekDtos));
    }
}
