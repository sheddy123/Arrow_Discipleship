using DiscipleUp.Api.Models;
using DiscipleUp.Api.Services;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize(Roles = "Student,Mentor,Parent,Admin")]
public class StudentController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private static LevelDto ToLevelDto(int xp)
    {
        var info = Leveling.For(xp);
        return new LevelDto(info.Level, info.Title, info.TotalXp, info.XpIntoLevel, info.XpForNextLevel);
    }

    // GET api/students/me/dashboard
    [HttpGet("me/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = UserId;

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId);

        DashboardCohortDto? cohortDto = null;
        List<DashboardTaskDto> todaysTasks = [];

        if (progress is not null)
        {
            var cohort = await db.Cohorts.FindAsync(progress.CohortId);

            if (cohort is not null)
            {
                var totalWeeks = await db.Weeks.CountAsync(w => w.CohortId == cohort.Id);
                var totalDays = Math.Max(totalWeeks * 7, 1);
                var dayOfJourney = (int)(DateTime.UtcNow.Date - cohort.StartDate.ToDateTime(TimeOnly.MinValue).Date).TotalDays + 1;
                cohortDto = new DashboardCohortDto(
                    cohort.Id, cohort.Name, cohort.StartDate,
                    progress.CurrentWeek, progress.CurrentDay,
                    Math.Clamp(dayOfJourney, 1, totalDays),
                    totalWeeks, totalDays);

                // Today's tasks = tasks for current day in current week
                var todayDay = await db.Days
                    .Where(d => d.Week.CohortId == cohort.Id
                             && d.Week.WeekNumber == progress.CurrentWeek
                             && d.DayNumber == progress.CurrentDay)
                    .Include(d => d.Tasks)
                    .FirstOrDefaultAsync();

                if (todayDay is not null)
                {
                    var completedTaskIds = await db.TaskCompletions
                        .Where(tc => tc.StudentId == userId && tc.CohortId == cohort.Id)
                        .Select(tc => tc.TaskId)
                        .ToHashSetAsync();

                    todaysTasks = todayDay.Tasks
                        .OrderBy(t => t.OrderIndex)
                        .Select(t => new DashboardTaskDto(t.Id, t.Title, completedTaskIds.Contains(t.Id)))
                        .ToList();
                }
            }
        }

        var recentBadges = await db.StudentBadges
            .Where(sb => sb.StudentId == userId)
            .OrderByDescending(sb => sb.EarnedAt)
            .Take(3)
            .Select(sb => new DashboardBadgeDto(sb.Badge.Name, sb.Badge.IconUrl, sb.EarnedAt))
            .ToListAsync();

        return Ok(new DashboardDto(
            progress?.CurrentStreak ?? 0,
            progress?.LongestStreak ?? 0,
            progress?.TotalTasksCompleted ?? 0,
            ToLevelDto(progress?.Xp ?? 0),
            cohortDto,
            todaysTasks,
            recentBadges
        ));
    }

    // GET api/students/me/announcements — the announcement feed for the student's cohort
    [HttpGet("me/announcements")]
    public async Task<IActionResult> GetAnnouncements()
    {
        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == UserId);
        if (progress is null) return Ok(Array.Empty<AnnouncementDto>());

        var list = await db.Announcements
            .Where(a => a.CohortId == progress.CohortId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Content,
                a.Author.FirstName + " " + a.Author.LastName, a.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    // GET api/students/me/quests — today's daily quests with live progress
    [HttpGet("me/quests")]
    public async Task<IActionResult> GetQuests([FromServices] QuestService quests)
    {
        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == UserId);
        if (progress is null) return Ok(Array.Empty<QuestDto>());
        return Ok(await quests.GetTodayAsync(UserId, progress.CohortId));
    }

    // POST api/students/me/quests/{id}/claim — claim a completed quest's XP reward
    [HttpPost("me/quests/{id:int}/claim")]
    public async Task<IActionResult> ClaimQuest(int id, [FromServices] QuestService quests)
    {
        var (error, result) = await quests.ClaimAsync(UserId, id);
        return error is null ? Ok(result) : BadRequest(new { error });
    }

    // GET api/students/me/journey
    [HttpGet("me/journey")]
    public async Task<IActionResult> GetJourney()
    {
        var userId = UserId;

        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.StudentId == userId);

        if (progress is null)
            return Ok(new { enrolled = false });

        var cohort = await db.Cohorts.FindAsync(progress.CohortId);
        if (cohort is null) return NotFound();

        var weeks = await db.Weeks
            .Where(w => w.CohortId == cohort.Id && w.IsPublished)
            .OrderBy(w => w.WeekNumber)
            .Include(w => w.Days).ThenInclude(d => d.Tasks)
            .Include(w => w.Assignments)
            .ToListAsync();

        var completedTaskIds = await db.TaskCompletions
            .Where(tc => tc.StudentId == userId && tc.CohortId == cohort.Id)
            .Select(tc => tc.TaskId)
            .ToHashSetAsync();

        var submittedAssignmentIds = await db.Submissions
            .Where(s => s.StudentId == userId && s.CohortId == cohort.Id)
            .Select(s => s.AssignmentId)
            .ToHashSetAsync();

        var unlocks = await db.WeekUnlocks
            .Where(wu => wu.StudentId == userId && wu.CohortId == cohort.Id)
            .Select(wu => wu.WeekNumber)
            .ToHashSetAsync();

        // Weeks are ordered by number; a week unlocks once the previous one is
        // fully complete (mirrors WeekGateFilter), or via a manual unlock, or if
        // the student's progress pointer already reached it.
        var weekDtos = new List<WeekStatusDto>();
        bool prevComplete = true; // week 1 has no prerequisite
        foreach (var w in weeks)
        {
            var allTaskIds = w.Days.SelectMany(d => d.Tasks).Select(t => t.Id).ToList();
            var daysCompleted = w.Days.Count(d => d.Tasks.All(t => completedTaskIds.Contains(t.Id)) && d.Tasks.Any());
            var assignment = w.Assignments.FirstOrDefault();
            var assignmentSubmitted = assignment is not null && submittedAssignmentIds.Contains(assignment.Id);

            bool allTasksDone = allTaskIds.Count > 0 && allTaskIds.All(id => completedTaskIds.Contains(id));
            bool weekComplete = allTasksDone && (assignment is null || assignmentSubmitted);

            WeekProgressStatus status;
            if (weekComplete)
                status = WeekProgressStatus.Completed;
            else if (w.WeekNumber == 1 || prevComplete || w.WeekNumber <= progress.CurrentWeek || unlocks.Contains(w.WeekNumber))
                status = WeekProgressStatus.InProgress;
            else
                status = WeekProgressStatus.Locked;

            weekDtos.Add(new WeekStatusDto(
                w.Id, w.WeekNumber, w.Title, w.Description,
                status, daysCompleted,
                assignment is not null, assignmentSubmitted));

            prevComplete = weekComplete;
        }

        var totalWeeks = weekDtos.Count;
        return Ok(new JourneyDto(cohort.Id, cohort.Name, progress.CurrentWeek, progress.CurrentDay,
            totalWeeks, Math.Max(totalWeeks * 7, 1), weekDtos));
    }

    // GET api/students/me/profile
    [HttpGet("me/profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = UserId;
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == userId);

        var earned = await db.StudentBadges
            .Where(sb => sb.StudentId == userId)
            .ToDictionaryAsync(sb => sb.BadgeId, sb => sb.EarnedAt);

        var badges = await db.Badges
            .OrderBy(b => b.Id)
            .Select(b => new { b.Id, b.Name, b.Description })
            .ToListAsync();

        return Ok(new StudentProfileDto(
            user.FirstName, user.LastName, user.Email ?? "", user.Timezone,
            progress?.IsOnLeaderboard ?? false,
            ToLevelDto(progress?.Xp ?? 0),
            badges.Select(b => new ProfileBadgeDto(
                b.Name, b.Description,
                earned.ContainsKey(b.Id),
                earned.TryGetValue(b.Id, out var at) ? at : null))));
    }

    // PUT api/students/me/leaderboard — opt in or out of the cohort leaderboard
    [HttpPut("me/leaderboard")]
    public async Task<IActionResult> SetLeaderboardOptIn(LeaderboardOptInRequest request)
    {
        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == UserId);
        if (progress is null) return NotFound(new { error = "Not enrolled in a cohort." });

        progress.IsOnLeaderboard = request.OptIn;
        progress.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { isOnLeaderboard = progress.IsOnLeaderboard });
    }

    // GET api/students/me/leaderboard — cohort leaderboard ranked by streak
    [HttpGet("me/leaderboard")]
    public async Task<IActionResult> GetLeaderboard()
    {
        var userId = UserId;
        var progress = await db.StudentProgresses.FirstOrDefaultAsync(sp => sp.StudentId == userId);
        if (progress is null) return Ok(new { enrolled = false });

        var entries = await db.StudentProgresses
            .Where(sp => sp.CohortId == progress.CohortId && sp.IsOnLeaderboard)
            .OrderByDescending(sp => sp.CurrentStreak)
            .ThenByDescending(sp => sp.TotalTasksCompleted)
            .Select(sp => new
            {
                sp.StudentId,
                Name = sp.Student.FirstName + " " + sp.Student.LastName,
                sp.CurrentStreak,
                sp.TotalTasksCompleted,
            })
            .ToListAsync();

        return Ok(new
        {
            enrolled = true,
            optedIn = progress.IsOnLeaderboard,
            entries = entries.Select((e, i) => new LeaderboardEntryDto(
                i + 1, e.Name, e.CurrentStreak, e.TotalTasksCompleted, e.StudentId == userId)),
        });
    }
}
