namespace DiscipleUp.Api.Services;

/// <summary>
/// Simple inline-styled HTML emails. Every template goes through Wrap so the
/// branding stays consistent.
/// </summary>
public static class EmailTemplates
{
    private static string Wrap(string title, string body) => $$"""
        <div style="font-family:Arial,Helvetica,sans-serif;background:#F4F3FA;padding:32px 16px">
          <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
            <div style="background:#160F2E;padding:20px 28px">
              <span style="font-size:20px;font-weight:800;color:#fff">Arr<span style="color:#F59E0B">ows</span></span>
            </div>
            <div style="padding:28px">
              <h2 style="margin:0 0 14px;color:#1E1B4B;font-size:18px">{{title}}</h2>
              <div style="color:#475569;font-size:14px;line-height:1.7">{{body}}</div>
            </div>
            <div style="padding:16px 28px;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:12px">
              Arrows · 28-day discipleship training
            </div>
          </div>
        </div>
        """;

    private static string Button(string url, string label) =>
        $"""<p style="margin:22px 0"><a href="{url}" style="background:#5B21B6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">{label}</a></p>""";

    public static string Welcome(string firstName) => Wrap(
        $"Welcome, {firstName}!",
        "<p>Your DiscipleUp account is ready. Once you're enrolled in a cohort, your 28-day journey begins — daily devotions, tasks, and weekly assignments.</p><p>See you on Day 1!</p>");

    public static string ParentalConsentInvite(string studentName, string consentUrl) => Wrap(
        "Parental consent needed",
        $"<p><strong>{studentName}</strong> wants to join DiscipleUp, a 28-day discipleship training programme. Because they are under 13, we need your consent before their account becomes active.</p>{Button(consentUrl, "Give consent & create your account")}<p>This link expires in 72 hours. You'll also get a read-only view of their progress.</p>");

    public static string PasswordReset(string firstName, string resetUrl) => Wrap(
        "Reset your password",
        $"<p>Hi {firstName}, we received a request to reset your DiscipleUp password.</p>{Button(resetUrl, "Reset password")}<p>This link expires in 2 hours. If you didn't ask for this, you can safely ignore it.</p>");

    public static string BadgeUnlocked(string firstName, string badgeName, string badgeDescription) => Wrap(
        $"🏅 You earned a badge, {firstName}!",
        $"<p style=\"font-size:16px\"><strong>{badgeName}</strong></p><p>{badgeDescription}</p><p>Keep going — your journey is building momentum.</p>");

    public static string WeekCompletionAlert(string mentorName, string studentName, int weekNumber) => Wrap(
        "Student milestone",
        $"<p>Hi {mentorName},</p><p><strong>{studentName}</strong> has completed all tasks for <strong>Week {weekNumber}</strong>. A great moment to check their assignment and send encouragement.</p>");

    public static string ParentWeeklySummary(string parentName, string childName, int currentWeek, int currentDay, int streak, int tasksDone, int totalTasks) => Wrap(
        $"{childName}'s week at a glance",
        $"""
        <p>Hi {parentName}, here's how {childName} is doing on their 28-day journey:</p>
        <ul style="padding-left:18px">
          <li>Position: <strong>Week {currentWeek}, Day {currentDay}</strong></li>
          <li>Current streak: <strong>{streak} day{(streak == 1 ? "" : "s")}</strong> 🔥</li>
          <li>Tasks completed: <strong>{tasksDone} of {totalTasks}</strong></li>
        </ul>
        <p>A word of encouragement from you goes a long way!</p>
        """);

    public static string TaskReminder(string firstName, int remainingTasks) => Wrap(
        $"⏰ {remainingTasks} task{(remainingTasks == 1 ? "" : "s")} left today",
        $"<p>Hi {firstName}, you still have <strong>{remainingTasks} task{(remainingTasks == 1 ? "" : "s")}</strong> to finish today. A few minutes now keeps your streak alive!</p>");
}
