namespace DiscipleUp.Api.Services;

/// A snapshot of a student's level derived from their total XP.
public record LevelInfo(int Level, string Title, int XpIntoLevel, int XpForNextLevel, int TotalXp);

/// Pure XP → level math. Levels get gradually more expensive so early wins come
/// fast and later ones feel earned. Keep this the single source of truth so the
/// award engine and the API report the same numbers.
public static class Leveling
{
    /// XP required to advance FROM <paramref name="level"/> TO the next one.
    public static int CostForLevel(int level) => 100 + (level - 1) * 50;

    /// A discipleship-flavoured rank title for a level.
    public static string TitleForLevel(int level) => level switch
    {
        >= 15 => "Ambassador",
        >= 10 => "Shepherd",
        >= 7 => "Devoted",
        >= 4 => "Disciple",
        >= 2 => "Follower",
        _ => "Seeker",
    };

    public static LevelInfo For(int totalXp)
    {
        var remaining = Math.Max(0, totalXp);
        var level = 1;
        while (remaining >= CostForLevel(level))
        {
            remaining -= CostForLevel(level);
            level++;
        }
        return new LevelInfo(level, TitleForLevel(level), remaining, CostForLevel(level), Math.Max(0, totalXp));
    }

    public static int LevelFor(int totalXp) => For(totalXp).Level;
}
