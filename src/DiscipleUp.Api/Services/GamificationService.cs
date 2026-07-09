using DiscipleUp.Api.Hubs;
using DiscipleUp.Api.Jobs;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Hangfire;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Services;

public record BadgeAward(string Name, string Description);

public record GamificationResult(int CurrentStreak, int LongestStreak, IReadOnlyList<BadgeAward> NewBadges);

/// <summary>
/// Central place for streak maintenance and badge triggers. Called after a task
/// completion or assignment submission; pushes StreakUpdated / BadgeUnlocked to
/// the student over SignalR and enqueues the badge email via Hangfire.
/// </summary>
public class GamificationService(AppDbContext db, IHubContext<CohortHub> hub, IBackgroundJobClient jobs)
{
    public async Task<GamificationResult> OnTaskCompletedAsync(string studentId, int cohortId, int weekNumber)
    {
        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == studentId && sp.CohortId == cohortId);
        if (progress is null) return new(0, 0, []);

        // Streaks run on the student's local calendar day
        var today = await GetLocalDateAsync(studentId);
        var streakExtended = progress.LastActivityDate != today;
        if (streakExtended)
        {
            progress.CurrentStreak = progress.LastActivityDate == today.AddDays(-1)
                ? progress.CurrentStreak + 1
                : 1;
        }
        progress.LastActivityDate = today;
        if (progress.CurrentStreak > progress.LongestStreak)
            progress.LongestStreak = progress.CurrentStreak;
        progress.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var newBadges = new List<BadgeAward>();

        if (progress.CurrentStreak >= 3)
            await TryAwardAsync(studentId, BadgeType.GettingStarted, newBadges);
        if (progress.CurrentStreak >= 7)
            await TryAwardAsync(studentId, BadgeType.SevenDayWarrior, newBadges);

        if (await IsWeekTasksDoneAsync(studentId, cohortId, weekNumber))
        {
            if (await IsWeekAssignmentDoneAsync(studentId, cohortId, weekNumber))
                await TryAwardAsync(studentId, BadgeType.WeekChampion, newBadges);
            // Perfect week = every task done without breaking the daily rhythm
            if (progress.CurrentStreak >= 7)
                await TryAwardAsync(studentId, BadgeType.PerfectWeek, newBadges);
        }

        var totalTasks = await db.Tasks.CountAsync(t => t.Day.Week.CohortId == cohortId);
        var totalDone = await db.TaskCompletions.CountAsync(tc => tc.StudentId == studentId && tc.CohortId == cohortId);
        if (totalTasks > 0 && totalDone >= totalTasks && progress.CurrentStreak >= 28)
            await TryAwardAsync(studentId, BadgeType.JourneyFinisher, newBadges);

        if (streakExtended)
            await hub.Clients.User(studentId).SendAsync("StreakUpdated",
                new { currentStreak = progress.CurrentStreak, longestStreak = progress.LongestStreak });
        foreach (var badge in newBadges)
            await hub.Clients.User(studentId).SendAsync("BadgeUnlocked", badge);

        return new(progress.CurrentStreak, progress.LongestStreak, newBadges);
    }

    public async Task<IReadOnlyList<BadgeAward>> OnAssignmentSubmittedAsync(string studentId, int cohortId, int weekNumber)
    {
        var newBadges = new List<BadgeAward>();

        await TryAwardAsync(studentId, BadgeType.FirstStep, newBadges);

        if (await IsWeekTasksDoneAsync(studentId, cohortId, weekNumber))
            await TryAwardAsync(studentId, BadgeType.WeekChampion, newBadges);

        foreach (var badge in newBadges)
            await hub.Clients.User(studentId).SendAsync("BadgeUnlocked", badge);

        return newBadges;
    }

    private async Task<bool> IsWeekTasksDoneAsync(string studentId, int cohortId, int weekNumber)
    {
        var weekTaskIds = await db.Tasks
            .Where(t => t.Day.Week.CohortId == cohortId && t.Day.Week.WeekNumber == weekNumber)
            .Select(t => t.Id).ToListAsync();
        if (weekTaskIds.Count == 0) return false;

        var doneCount = await db.TaskCompletions
            .CountAsync(tc => tc.StudentId == studentId && tc.CohortId == cohortId && weekTaskIds.Contains(tc.TaskId));
        return doneCount >= weekTaskIds.Count;
    }

    private async Task<bool> IsWeekAssignmentDoneAsync(string studentId, int cohortId, int weekNumber)
    {
        var assignmentIds = await db.Assignments
            .Where(a => a.Week.CohortId == cohortId && a.Week.WeekNumber == weekNumber)
            .Select(a => a.Id).ToListAsync();
        if (assignmentIds.Count == 0) return true;

        return await db.Submissions.AnyAsync(s =>
            s.StudentId == studentId && s.CohortId == cohortId && assignmentIds.Contains(s.AssignmentId));
    }

    private async Task TryAwardAsync(string studentId, BadgeType type, List<BadgeAward> collector)
    {
        var badge = await db.Badges.FirstOrDefaultAsync(b => b.Type == type);
        if (badge is null) return;

        var alreadyEarned = await db.StudentBadges.AnyAsync(sb => sb.StudentId == studentId && sb.BadgeId == badge.Id);
        if (alreadyEarned) return;

        db.StudentBadges.Add(new StudentBadge { StudentId = studentId, BadgeId = badge.Id });
        await db.SaveChangesAsync();
        collector.Add(new BadgeAward(badge.Name, badge.Description));

        jobs.Enqueue<EmailJobs>(j => j.SendBadgeUnlockEmailAsync(studentId, badge.Name, badge.Description));
    }

    private async Task<DateOnly> GetLocalDateAsync(string userId)
    {
        var timezone = await db.Users.Where(u => u.Id == userId).Select(u => u.Timezone).FirstOrDefaultAsync() ?? "UTC";
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timezone);
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));
        }
        catch
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
    }
}
