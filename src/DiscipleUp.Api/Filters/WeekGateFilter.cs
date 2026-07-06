using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Filters;

[AttributeUsage(AttributeTargets.Method)]
public class WeekGateAttribute : Attribute { }

public class WeekGateFilter(AppDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Only run gate when the [WeekGate] marker attribute is present
        if (context.ActionDescriptor.EndpointMetadata.OfType<WeekGateAttribute>().Any() == false)
        {
            await next();
            return;
        }

        var userId = context.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId is null) { context.Result = new UnauthorizedResult(); return; }

        if (!context.RouteData.Values.TryGetValue("cohortId", out var cohortIdRaw) ||
            !int.TryParse(cohortIdRaw?.ToString(), out int cohortId) ||
            !context.RouteData.Values.TryGetValue("weekNumber", out var weekNumRaw) ||
            !int.TryParse(weekNumRaw?.ToString(), out int weekNumber))
        {
            await next();
            return;
        }

        // Week 1 is always accessible
        if (weekNumber <= 1) { await next(); return; }

        // Manual unlock short-circuits the gate
        var hasUnlock = await db.WeekUnlocks.AnyAsync(wu =>
            wu.StudentId == userId && wu.CohortId == cohortId && wu.WeekNumber == weekNumber);
        if (hasUnlock) { await next(); return; }

        // Gate: all tasks in the previous week must be completed
        var prevWeek = await db.Weeks
            .Where(w => w.CohortId == cohortId && w.WeekNumber == weekNumber - 1)
            .Include(w => w.Days).ThenInclude(d => d.Tasks)
            .FirstOrDefaultAsync();

        if (prevWeek is null) { await next(); return; }

        var requiredTaskIds = prevWeek.Days
            .SelectMany(d => d.Tasks)
            .Select(t => t.Id)
            .ToList();

        if (requiredTaskIds.Count == 0) { await next(); return; }

        var completedCount = await db.TaskCompletions.CountAsync(tc =>
            tc.StudentId == userId &&
            tc.CohortId == cohortId &&
            requiredTaskIds.Contains(tc.TaskId));

        if (completedCount < requiredTaskIds.Count)
        {
            context.Result = new ObjectResult(new { error = "Complete all tasks in the previous week to unlock this one." })
            {
                StatusCode = 403
            };
            return;
        }

        // Gate: assignment for previous week must be submitted (if one exists)
        var prevAssignment = await db.Assignments
            .Where(a => a.WeekId == prevWeek.Id)
            .FirstOrDefaultAsync();

        if (prevAssignment is not null)
        {
            var submitted = await db.Submissions.AnyAsync(s =>
                s.StudentId == userId &&
                s.AssignmentId == prevAssignment.Id &&
                s.CohortId == cohortId);

            if (!submitted)
            {
                context.Result = new ObjectResult(new { error = "Submit your assignment for the previous week to unlock this one." })
                {
                    StatusCode = 403
                };
                return;
            }
        }

        await next();
    }
}
