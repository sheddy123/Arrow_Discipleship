namespace DiscipleUp.Domain.Enums;

/// The measurable signal an admin-authored (Custom) badge is awarded on. The
/// badge unlocks once the student's value for the signal reaches the badge's
/// Threshold. Built-in badges use None (their triggers live in code).
public enum BadgeCriterion
{
    None = 0,

    /// Current daily streak (consecutive active days).
    CurrentStreak = 1,

    /// Total tasks the student has completed in their cohort.
    TasksCompleted = 2,

    /// Number of assignments the student has submitted in their cohort.
    AssignmentsSubmitted = 3,
}
