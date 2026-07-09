using DiscipleUp.Api.Services;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Jobs;

/// <summary>
/// Runs hourly. For students whose local clock is in the 17:00 hour and who
/// still have unfinished tasks for their current day, sends a reminder email.
/// </summary>
public class TaskReminderJob(AppDbContext db, IEmailService email)
{
    public async Task RunAsync()
    {
        var utcNow = DateTime.UtcNow;

        var progresses = await db.StudentProgresses
            .Include(sp => sp.Student)
            .ToListAsync();

        foreach (var sp in progresses)
        {
            if (sp.Student.Email is null) continue;

            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(sp.Student.Timezone); }
            catch { tz = TimeZoneInfo.Utc; }

            // Only the timezone group at 17:xx local gets reminded this run
            if (TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz).Hour != 17) continue;

            var todayTaskIds = await db.Tasks
                .Where(t => t.Day.Week.CohortId == sp.CohortId
                         && t.Day.Week.WeekNumber == sp.CurrentWeek
                         && t.Day.DayNumber == sp.CurrentDay)
                .Select(t => t.Id)
                .ToListAsync();
            if (todayTaskIds.Count == 0) continue;

            var doneCount = await db.TaskCompletions.CountAsync(tc =>
                tc.StudentId == sp.StudentId && tc.CohortId == sp.CohortId && todayTaskIds.Contains(tc.TaskId));

            var remaining = todayTaskIds.Count - doneCount;
            if (remaining <= 0) continue;

            await email.SendAsync(sp.Student.Email,
                $"⏰ {remaining} task{(remaining == 1 ? "" : "s")} left today",
                EmailTemplates.TaskReminder(sp.Student.FirstName, remaining));
        }
    }
}
