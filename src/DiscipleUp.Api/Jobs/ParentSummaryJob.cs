using DiscipleUp.Api.Services;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Jobs;

/// <summary>
/// Runs hourly. For parents whose local clock is in the Sunday 18:00 hour,
/// sends a weekly progress summary for each linked child that is enrolled.
/// </summary>
public class ParentSummaryJob(AppDbContext db, IEmailService email)
{
    public async Task RunAsync()
    {
        var utcNow = DateTime.UtcNow;

        var parents = await db.Users
            .Where(p => db.Users.Any(c => c.LinkedParentId == p.Id))
            .ToListAsync();

        foreach (var parent in parents)
        {
            if (parent.Email is null) continue;

            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(parent.Timezone); }
            catch { tz = TimeZoneInfo.Utc; }

            var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
            if (local.DayOfWeek != DayOfWeek.Sunday || local.Hour != 18) continue;

            var children = await db.Users.Where(c => c.LinkedParentId == parent.Id).ToListAsync();
            foreach (var child in children)
            {
                var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == child.Id);
                if (progress is null) continue;

                var totalTasks = await db.Tasks.CountAsync(t => t.Day.Week.CohortId == progress.CohortId);

                await email.SendAsync(parent.Email,
                    $"{child.FirstName}'s weekly DiscipleUp summary",
                    EmailTemplates.ParentWeeklySummary(
                        parent.FirstName, child.FirstName,
                        progress.CurrentWeek, progress.CurrentDay,
                        progress.CurrentStreak, progress.TotalTasksCompleted, totalTasks));
            }
        }
    }
}
