namespace DiscipleUp.Domain.Enums;

/// The kinds of daily quest a student can be set. Progress is computed from the
/// student's activity that day, not stored.
public enum QuestType
{
    /// Complete at least one task today (keep the streak alive).
    KeepStreak = 0,

    /// Complete a number of tasks today.
    CompleteTasks = 1,

    /// Memorise a scripture verse today.
    MemoriseVerse = 2,
}
