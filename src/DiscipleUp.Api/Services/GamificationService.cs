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

/// The XP/level outcome of an action.
public record XpResult(int XpGained, int Xp, int Level, string LevelTitle, bool LeveledUp);

public record GamificationResult(
    int CurrentStreak,
    int LongestStreak,
    IReadOnlyList<BadgeAward> NewBadges,
    XpResult Xp);

/// <summary>
/// Central place for streak maintenance and badge triggers. Called after a task
/// completion or assignment submission; pushes StreakUpdated / BadgeUnlocked to
/// the student over SignalR and enqueues the badge email via Hangfire.
/// </summary>
public class GamificationService(AppDbContext db, IHubContext<CohortHub> hub, IBackgroundJobClient jobs)
{
    // XP rewards for the actions that make up the journey.
    public const int TaskXp = 10;
    public const int AssignmentXp = 50;
    public const int WeekCompleteXp = 100;
    public const int ScriptureXp = 30;
    public const int BadgeXp = 25;

    public async Task<GamificationResult> OnTaskCompletedAsync(string studentId, int cohortId, int weekNumber)
    {
        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == studentId && sp.CohortId == cohortId);
        if (progress is null) return new(0, 0, [], NoXp());

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

        var weekJustCompleted = false;
        if (await IsWeekTasksDoneAsync(studentId, cohortId, weekNumber))
        {
            if (await IsWeekAssignmentDoneAsync(studentId, cohortId, weekNumber))
            {
                var before = newBadges.Count;
                await TryAwardAsync(studentId, BadgeType.WeekChampion, newBadges);
                weekJustCompleted = newBadges.Count > before;
            }
            // Perfect week = every task done without breaking the daily rhythm
            if (progress.CurrentStreak >= 7)
                await TryAwardAsync(studentId, BadgeType.PerfectWeek, newBadges);
        }

        var totalTasks = await db.Tasks.CountAsync(t => t.Day.Week.CohortId == cohortId);
        var totalDone = await db.TaskCompletions.CountAsync(tc => tc.StudentId == studentId && tc.CohortId == cohortId);
        if (totalTasks > 0 && totalDone >= totalTasks && progress.CurrentStreak >= 28)
            await TryAwardAsync(studentId, BadgeType.JourneyFinisher, newBadges);

        await EvaluateCustomBadgesAsync(studentId, cohortId, progress, newBadges);

        // XP: the task itself, plus bonuses for any badge and a finished week.
        var xpGained = TaskXp + newBadges.Count * BadgeXp + (weekJustCompleted ? WeekCompleteXp : 0);
        var xp = await ApplyXpAsync(studentId, progress, xpGained);

        if (streakExtended)
            await hub.Clients.User(studentId).SendAsync("StreakUpdated",
                new { currentStreak = progress.CurrentStreak, longestStreak = progress.LongestStreak });
        foreach (var badge in newBadges)
            await hub.Clients.User(studentId).SendAsync("BadgeUnlocked", badge);

        return new(progress.CurrentStreak, progress.LongestStreak, newBadges, xp);
    }

    public async Task<XpResult> OnAssignmentSubmittedAsync(string studentId, int cohortId, int weekNumber)
    {
        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == studentId && sp.CohortId == cohortId);
        if (progress is null) return NoXp();

        var newBadges = new List<BadgeAward>();

        await TryAwardAsync(studentId, BadgeType.FirstStep, newBadges);

        var weekJustCompleted = false;
        if (await IsWeekTasksDoneAsync(studentId, cohortId, weekNumber))
        {
            var before = newBadges.Count;
            await TryAwardAsync(studentId, BadgeType.WeekChampion, newBadges);
            weekJustCompleted = newBadges.Count > before;
        }

        await EvaluateCustomBadgesAsync(studentId, cohortId, progress, newBadges);

        foreach (var badge in newBadges)
            await hub.Clients.User(studentId).SendAsync("BadgeUnlocked", badge);

        var xpGained = AssignmentXp + newBadges.Count * BadgeXp + (weekJustCompleted ? WeekCompleteXp : 0);
        return await ApplyXpAsync(studentId, progress, xpGained);
    }

    /// Award an ad-hoc chunk of XP (e.g. memorising a scripture) and report any
    /// level-up. Safe to call for students without a progress row (no-op).
    public async Task<XpResult> AwardXpAsync(string studentId, int cohortId, int amount)
    {
        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == studentId && sp.CohortId == cohortId);
        return progress is null ? NoXp() : await ApplyXpAsync(studentId, progress, amount);
    }

    private static XpResult NoXp() => new(0, 0, 1, Leveling.TitleForLevel(1), false);

    /// Add XP to a loaded progress row, persist, and push a LevelUp event when the
    /// student crosses into a new level. Returns the resulting XP/level snapshot.
    private async Task<XpResult> ApplyXpAsync(string studentId, StudentProgress progress, int amount)
    {
        if (amount <= 0)
        {
            var flat = Leveling.For(progress.Xp);
            return new XpResult(0, progress.Xp, flat.Level, flat.Title, false);
        }

        var beforeLevel = Leveling.LevelFor(progress.Xp);
        progress.Xp += amount;
        progress.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var after = Leveling.For(progress.Xp);
        var leveledUp = after.Level > beforeLevel;
        if (leveledUp)
            await hub.Clients.User(studentId).SendAsync("LevelUp",
                new { level = after.Level, title = after.Title });

        return new XpResult(amount, progress.Xp, after.Level, after.Title, leveledUp);
    }

    /// Awards any admin-authored (Custom) badge whose configured criterion the
    /// student has now reached and which they haven't already earned.
    private async Task EvaluateCustomBadgesAsync(string studentId, int cohortId, StudentProgress progress, List<BadgeAward> collector)
    {
        var customBadges = await db.Badges
            .Where(b => b.Type == BadgeType.Custom && b.Criterion != BadgeCriterion.None)
            .ToListAsync();
        if (customBadges.Count == 0) return;

        var earned = await db.StudentBadges
            .Where(sb => sb.StudentId == studentId)
            .Select(sb => sb.BadgeId)
            .ToHashSetAsync();

        // Only compute the signals a live badge actually depends on.
        var wanted = customBadges.Where(b => !earned.Contains(b.Id)).Select(b => b.Criterion).ToHashSet();
        var assignmentsSubmitted = wanted.Contains(BadgeCriterion.AssignmentsSubmitted)
            ? await db.Submissions.CountAsync(s => s.StudentId == studentId && s.CohortId == cohortId)
            : 0;
        var tasksCompleted = wanted.Contains(BadgeCriterion.TasksCompleted)
            ? await db.TaskCompletions.CountAsync(tc => tc.StudentId == studentId && tc.CohortId == cohortId)
            : 0;

        foreach (var badge in customBadges)
        {
            if (earned.Contains(badge.Id)) continue;
            var value = badge.Criterion switch
            {
                BadgeCriterion.CurrentStreak => progress.CurrentStreak,
                BadgeCriterion.TasksCompleted => tasksCompleted,
                BadgeCriterion.AssignmentsSubmitted => assignmentsSubmitted,
                _ => 0,
            };
            if (value < badge.Threshold) continue;

            db.StudentBadges.Add(new StudentBadge { StudentId = studentId, BadgeId = badge.Id });
            await db.SaveChangesAsync();
            collector.Add(new BadgeAward(badge.Name, badge.Description));
            jobs.Enqueue<EmailJobs>(j => j.SendBadgeUnlockEmailAsync(studentId, badge.Name, badge.Description));
        }
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
