using DiscipleUp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Jobs;

/// <summary>
/// Runs hourly at :05 (covering every timezone group's 00:05 local time).
/// For students whose local clock has just passed midnight, breaks the streak
/// when yesterday had no activity.
/// </summary>
public class StreakResetJob(AppDbContext db)
{
    public async Task RunAsync()
    {
        var utcNow = DateTime.UtcNow;

        var progresses = await db.StudentProgresses
            .Where(sp => sp.CurrentStreak > 0)
            .Include(sp => sp.Student)
            .ToListAsync();

        foreach (var sp in progresses)
        {
            TimeZoneInfo tz;
            try { tz = TimeZoneInfo.FindSystemTimeZoneById(sp.Student.Timezone); }
            catch { tz = TimeZoneInfo.Utc; }

            var localNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
            // Only the timezone group that just crossed midnight is processed this run
            if (localNow.Hour != 0) continue;

            var localToday = DateOnly.FromDateTime(localNow);
            if (sp.LastActivityDate is null || sp.LastActivityDate < localToday.AddDays(-1))
            {
                sp.CurrentStreak = 0;
                sp.UpdatedAt = utcNow;
            }
        }

        await db.SaveChangesAsync();
    }
}
