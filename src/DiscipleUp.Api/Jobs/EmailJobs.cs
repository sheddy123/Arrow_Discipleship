using DiscipleUp.Api.Services;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Jobs;

/// <summary>
/// One-off email sends enqueued from request handlers so the HTTP response
/// never waits on the mail provider.
/// </summary>
public class EmailJobs(AppDbContext db, IEmailService email)
{
    public async Task SendBadgeUnlockEmailAsync(string studentId, string badgeName, string badgeDescription)
    {
        var student = await db.Users.FindAsync(studentId);
        if (student?.Email is null) return;

        await email.SendAsync(student.Email, $"🏅 Badge unlocked: {badgeName}",
            EmailTemplates.BadgeUnlocked(student.FirstName, badgeName, badgeDescription));
    }

    public async Task SendWeekCompletionAlertAsync(string studentId, int cohortId, int weekNumber)
    {
        var mentor = await db.Cohorts
            .Where(c => c.Id == cohortId)
            .Select(c => new { c.Mentor.FirstName, c.Mentor.Email })
            .FirstOrDefaultAsync();
        if (mentor?.Email is null) return;

        var studentName = await db.Users
            .Where(u => u.Id == studentId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstAsync();

        await email.SendAsync(mentor.Email, $"{studentName} completed Week {weekNumber}",
            EmailTemplates.WeekCompletionAlert(mentor.FirstName, studentName, weekNumber));
    }
}
