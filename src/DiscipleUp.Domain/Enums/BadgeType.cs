namespace DiscipleUp.Domain.Enums;

public enum BadgeType
{
    GettingStarted,
    SevenDayWarrior,
    JourneyFinisher,
    FirstStep,
    WeekChampion,
    PerfectWeek,

    /// Admin-authored badge, awarded by a configurable <see cref="BadgeCriterion"/>
    /// rather than one of the built-in triggers above.
    Custom
}
