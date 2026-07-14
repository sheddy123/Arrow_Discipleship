using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Services;

/// Issues and evaluates a student's daily quests. Quests are generated on first
/// request each local day; their progress is derived from the day's activity so
/// only the "claimed" flag needs storing.
public class QuestService(AppDbContext db, GamificationService gamification)
{
    private static readonly (QuestType Type, int Target, int Reward)[] Templates =
    [
        (QuestType.KeepStreak, 1, 15),
        (QuestType.CompleteTasks, 3, 30),
        (QuestType.MemoriseVerse, 1, 40),
    ];

    public async Task<List<QuestDto>> GetTodayAsync(string studentId, int cohortId, CancellationToken ct = default)
    {
        var (localDate, startUtc, endUtc) = await LocalDayAsync(studentId, ct);

        var quests = await db.DailyQuests
            .Where(q => q.StudentId == studentId && q.CohortId == cohortId && q.LocalDate == localDate)
            .ToListAsync(ct);

        if (quests.Count == 0)
        {
            quests = Templates.Select(t => new DailyQuest
            {
                StudentId = studentId, CohortId = cohortId, LocalDate = localDate,
                Type = t.Type, Target = t.Target, RewardXp = t.Reward,
            }).ToList();
            db.DailyQuests.AddRange(quests);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Raced with a concurrent request that generated today's quests
                // first (unique index). Reload the winning rows.
                db.ChangeTracker.Clear();
                quests = await db.DailyQuests
                    .Where(q => q.StudentId == studentId && q.CohortId == cohortId && q.LocalDate == localDate)
                    .ToListAsync(ct);
            }
        }

        var tasksToday = await CountTasksTodayAsync(studentId, cohortId, startUtc, endUtc, ct);
        var verseToday = await MemorisedTodayAsync(studentId, cohortId, startUtc, endUtc, ct);

        return quests
            .OrderBy(q => q.Type)
            .Select(q =>
            {
                var progress = ProgressFor(q.Type, q.Target, tasksToday, verseToday);
                var (title, desc) = Describe(q.Type, q.Target);
                return new QuestDto(q.Id, q.Type.ToString(), title, desc, q.Target,
                    progress, q.RewardXp, progress >= q.Target, q.Claimed);
            })
            .ToList();
    }

    public async Task<(string? Error, ClaimQuestResponse? Result)> ClaimAsync(string studentId, int questId, CancellationToken ct = default)
    {
        var quest = await db.DailyQuests.FirstOrDefaultAsync(q => q.Id == questId && q.StudentId == studentId, ct);
        if (quest is null) return ("Quest not found.", null);
        if (quest.Claimed) return ("Reward already claimed.", null);

        var (localDate, startUtc, endUtc) = await LocalDayAsync(studentId, ct);
        if (quest.LocalDate != localDate) return ("This quest has expired.", null);

        // Re-check completion server-side before granting the reward.
        var tasksToday = await CountTasksTodayAsync(studentId, quest.CohortId, startUtc, endUtc, ct);
        var verseToday = await MemorisedTodayAsync(studentId, quest.CohortId, startUtc, endUtc, ct);
        if (ProgressFor(quest.Type, quest.Target, tasksToday, verseToday) < quest.Target)
            return ("Quest isn't complete yet.", null);

        quest.Claimed = true;
        await db.SaveChangesAsync(ct);

        var xp = await gamification.AwardXpAsync(studentId, quest.CohortId, quest.RewardXp);
        return (null, new ClaimQuestResponse(quest.RewardXp, xp.Xp, xp.Level, xp.LevelTitle, xp.LeveledUp));
    }

    private Task<int> CountTasksTodayAsync(string studentId, int cohortId, DateTime startUtc, DateTime endUtc, CancellationToken ct) =>
        db.TaskCompletions.CountAsync(tc =>
            tc.StudentId == studentId && tc.CohortId == cohortId
            && tc.CompletedAt >= startUtc && tc.CompletedAt < endUtc, ct);

    private Task<bool> MemorisedTodayAsync(string studentId, int cohortId, DateTime startUtc, DateTime endUtc, CancellationToken ct) =>
        db.ScriptureMemories.AnyAsync(sm =>
            sm.StudentId == studentId && sm.Week.CohortId == cohortId
            && sm.MarkedAt >= startUtc && sm.MarkedAt < endUtc, ct);

    private static int ProgressFor(QuestType type, int target, int tasksToday, bool verseToday) => type switch
    {
        QuestType.KeepStreak => Math.Min(tasksToday, target),
        QuestType.CompleteTasks => Math.Min(tasksToday, target),
        QuestType.MemoriseVerse => verseToday ? target : 0,
        _ => 0,
    };

    private static (string Title, string Description) Describe(QuestType type, int target) => type switch
    {
        QuestType.KeepStreak => ("Keep your streak alive", "Complete at least one task today"),
        QuestType.CompleteTasks => ($"Complete {target} tasks", "Work through today's tasks"),
        QuestType.MemoriseVerse => ("Memorise a verse", "Mark a scripture as memorised today"),
        _ => ("Quest", ""),
    };

    private async Task<(DateOnly Local, DateTime StartUtc, DateTime EndUtc)> LocalDayAsync(string studentId, CancellationToken ct)
    {
        var tzId = await db.Users.Where(u => u.Id == studentId).Select(u => u.Timezone).FirstOrDefaultAsync(ct) ?? "UTC";
        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById(tzId); } catch { tz = TimeZoneInfo.Utc; }

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var localDate = DateOnly.FromDateTime(localNow);
        var midnight = DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        DateTime startUtc;
        try { startUtc = TimeZoneInfo.ConvertTimeToUtc(midnight, tz); }
        catch { startUtc = DateTime.UtcNow.Date; }
        return (localDate, startUtc, startUtc.AddDays(1));
    }
}
