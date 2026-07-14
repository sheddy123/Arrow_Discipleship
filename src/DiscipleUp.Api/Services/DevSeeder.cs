using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Services;

/// <summary>
/// Development-only seed data: a full set of test users, a published cohort with
/// 4 weeks of content, and varied student progress so every screen has something
/// to show. Idempotent — bails out if the seed admin already exists.
/// </summary>
public class DevSeeder(
    AppDbContext db,
    UserManager<ApplicationUser> userManager)
{
    private const string Password = "Passw0rd!";

    private static readonly (string Title, string[] DayTitles)[] WeekPlan =
    [
        ("Foundations of Faith",  ["Who Is Jesus?", "Grace & Forgiveness", "New Identity", "The Cross", "Resurrection Hope", "Repentance", "Assurance of Salvation"]),
        ("Growing in Prayer",     ["Why We Pray", "The Lord's Prayer", "Praise & Thanksgiving", "Praying Scripture", "Persistence", "Listening to God", "Praying Together"]),
        ("The Word of God",       ["Bible Overview", "How to Read It", "Meditation", "Memorizing Scripture", "Obeying the Word", "The Gospel Story", "Living by Truth"]),
        ("Living on Mission",     ["Your Story", "Sharing the Gospel", "Loving Your Neighbour", "Serving Others", "Discipling Others", "The Church", "Sent Ones"]),
    ];

    private static readonly (string Ref, string Text)[] Verses =
    [
        ("John 3:16", "For God so loved the world that he gave his one and only Son."),
        ("Ephesians 2:8", "For it is by grace you have been saved, through faith."),
        ("2 Corinthians 5:17", "If anyone is in Christ, the new creation has come."),
        ("Romans 5:8", "While we were still sinners, Christ died for us."),
        ("Philippians 4:6", "Do not be anxious about anything, but in every situation, by prayer, present your requests to God."),
        ("Psalm 119:105", "Your word is a lamp for my feet, a light on my path."),
        ("Matthew 28:19", "Go and make disciples of all nations."),
    ];

    public async Task SeedAsync()
    {
        if (await userManager.FindByEmailAsync("admin@discipleup.test") is not null)
            return; // already seeded

        // ── Users ──────────────────────────────────────────────────────────
        var admin  = await CreateUser("admin@discipleup.test",  "Ada",    "Admin",   "Admin",  new DateOnly(1985, 4, 12));
        var mentor = await CreateUser("mentor@discipleup.test", "Mark",   "Mentor",  "Mentor", new DateOnly(1990, 8, 3));
        var parent = await CreateUser("parent@discipleup.test", "Paula",  "Parent",  "Parent", new DateOnly(1982, 1, 22));

        var grace  = await CreateUser("grace@discipleup.test",  "Grace",  "Okafor",  "Student", new DateOnly(2005, 6, 15));
        var samuel = await CreateUser("samuel@discipleup.test", "Samuel", "Bello",   "Student", new DateOnly(2004, 11, 2));
        var hannah = await CreateUser("hannah@discipleup.test", "Hannah", "Eze",     "Student", new DateOnly(2006, 3, 9));
        var david  = await CreateUser("david@discipleup.test",  "David",  "Okon",    "Student", new DateOnly(2005, 9, 28));
        var caleb  = await CreateUser("caleb@discipleup.test",  "Caleb",  "Adeyemi", "Student", new DateOnly(2003, 12, 1));

        // A child linked to the parent account (parental-consent flow already completed)
        var ruth = await CreateUser("ruth@discipleup.test", "Ruth", "Parent", "Student", new DateOnly(2014, 5, 20));
        ruth.LinkedParentId = parent.Id;
        await userManager.UpdateAsync(ruth);

        // ── Cohort + content ───────────────────────────────────────────────
        var cohort = new Cohort
        {
            Name = "Spring 2026 Cohort",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-14)),
            LateEntryWindowDays = 5,
            MentorId = mentor.Id,
            IsPaid = false,
            Status = CohortStatus.Active,
        };
        db.Cohorts.Add(cohort);
        await db.SaveChangesAsync();

        // Mentor is a cohort member too
        db.CohortUsers.Add(new CohortUser { CohortId = cohort.Id, UserId = mentor.Id, Role = CohortRole.Mentor });

        var weeks = new List<Week>();
        for (var w = 0; w < WeekPlan.Length; w++)
        {
            var week = new Week
            {
                CohortId = cohort.Id,
                WeekNumber = w + 1,
                Title = WeekPlan[w].Title,
                Description = $"Week {w + 1} of the 28-day journey.",
                IsPublished = true,
            };
            db.Weeks.Add(week);
            await db.SaveChangesAsync();
            weeks.Add(week);

            for (var d = 0; d < 7; d++)
            {
                var (vref, vtext) = Verses[d];
                var day = new Day
                {
                    WeekId = week.Id,
                    DayNumber = d + 1,
                    Title = WeekPlan[w].DayTitles[d],
                    DevotionText = $"Today we reflect on {WeekPlan[w].DayTitles[d].ToLower()}. Take a few quiet minutes to read the passage, sit with it, and ask God to speak. Let the truth settle before you move on with your day.",
                    ScriptureReference = vref,
                    ScriptureText = vtext,
                };
                db.Days.Add(day);
                await db.SaveChangesAsync();

                db.Tasks.AddRange(
                    new DiscipleTask { DayId = day.Id, Title = "Read today's devotion",   Description = "Read slowly and prayerfully.",        OrderIndex = 0 },
                    new DiscipleTask { DayId = day.Id, Title = $"Memorize {vref}",         Description = "Say it aloud three times.",            OrderIndex = 1 },
                    new DiscipleTask { DayId = day.Id, Title = "Journal one reflection",   Description = "Write a sentence on what stood out.",  OrderIndex = 2 });
            }

            db.Assignments.Add(new Assignment
            {
                WeekId = week.Id,
                Title = $"Week {w + 1} Reflection: {WeekPlan[w].Title}",
                Description = $"In a few sentences, share what you learned this week about {WeekPlan[w].Title.ToLower()} and one way you'll apply it.",
                AllowsFileUpload = true,
            });

            db.Sessions.Add(new Session
            {
                WeekId = week.Id,
                Title = $"Week {w + 1} Teaching: {WeekPlan[w].Title}",
                VideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                Description = "Watch the weekly teaching video before your group meets.",
                AddedByUserId = mentor.Id,
            });
        }
        await db.SaveChangesAsync();

        // ── Enrolment + progress ───────────────────────────────────────────
        // (student, currentWeek, currentDay, streak, longest, onLeaderboard, lastActivityDaysAgo)
        var enrolments = new[]
        {
            (grace,  2, 3,  9, 12, true,  0),
            (samuel, 1, 5,  5,  5, true,  0),
            (hannah, 3, 1, 15, 15, true,  1),
            (david,  1, 2,  0,  3, false, 4),   // at risk: stale + behind
            (caleb,  4, 6, 24, 24, true,  0),
            (ruth,   1, 4,  4,  4, false, 0),   // the linked child
        };

        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var badgeCatalogue = await db.Badges.ToDictionaryAsync(b => b.Type, b => b.Id);

        foreach (var (student, curWeek, curDay, streak, longest, onBoard, staleDays) in enrolments)
        {
            db.CohortUsers.Add(new CohortUser { CohortId = cohort.Id, UserId = student.Id, Role = CohortRole.Student });

            // Complete every task from earlier weeks and earlier days of the current week
            var completedCount = 0;
            foreach (var week in weeks)
            {
                var days = await db.Days
                    .Where(x => x.WeekId == week.Id)
                    .Include(x => x.Tasks)
                    .OrderBy(x => x.DayNumber)
                    .ToListAsync();

                foreach (var day in days)
                {
                    bool dayDone = week.WeekNumber < curWeek
                                   || (week.WeekNumber == curWeek && day.DayNumber < curDay);
                    if (!dayDone) continue;

                    foreach (var task in day.Tasks)
                    {
                        db.TaskCompletions.Add(new TaskCompletion
                        {
                            StudentId = student.Id,
                            TaskId = task.Id,
                            CohortId = cohort.Id,
                            CompletedAt = DateTime.UtcNow.AddDays(-staleDays),
                        });
                        completedCount++;
                    }
                }
            }

            db.StudentProgresses.Add(new StudentProgress
            {
                StudentId = student.Id,
                CohortId = cohort.Id,
                CurrentWeek = curWeek,
                CurrentDay = curDay,
                CurrentStreak = streak,
                LongestStreak = longest,
                LastActivityDate = today.AddDays(-staleDays),
                TotalTasksCompleted = completedCount,
                IsOnLeaderboard = onBoard,
                // Approximate the XP they'd have accrued: every task, plus the
                // assignment + scripture + week bonus for each finished week.
                Xp = completedCount * GamificationService.TaskXp
                    + Math.Max(0, curWeek - 1) * (GamificationService.AssignmentXp
                        + GamificationService.ScriptureXp + GamificationService.WeekCompleteXp),
            });

            // Submit assignments for fully-completed weeks
            for (var wi = 0; wi < curWeek - 1; wi++)
            {
                var assignment = await db.Assignments.FirstAsync(a => a.WeekId == weeks[wi].Id);
                db.Submissions.Add(new Submission
                {
                    StudentId = student.Id,
                    AssignmentId = assignment.Id,
                    CohortId = cohort.Id,
                    TextContent = $"This week deepened my understanding of {weeks[wi].Title.ToLower()}. I want to keep building the daily habit and share what I'm learning with a friend.",
                    SubmittedAt = DateTime.UtcNow.AddDays(-(curWeek - wi) * 3),
                });

                // Scripture memory marked for completed weeks
                db.ScriptureMemories.Add(new ScriptureMemory { StudentId = student.Id, WeekId = weeks[wi].Id });
            }

            // Award badges that match this student's progress
            if (streak >= 3)  AddBadge(badgeCatalogue, student.Id, BadgeType.GettingStarted);
            if (streak >= 7)  AddBadge(badgeCatalogue, student.Id, BadgeType.SevenDayWarrior);
            if (curWeek > 1)  AddBadge(badgeCatalogue, student.Id, BadgeType.FirstStep);
            if (curWeek > 1)  AddBadge(badgeCatalogue, student.Id, BadgeType.WeekChampion);
        }
        await db.SaveChangesAsync();

        // ── Mentor feedback on some submissions ────────────────────────────
        var gracesFirst = await db.Submissions
            .Where(s => s.StudentId == grace.Id)
            .OrderBy(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
        if (gracesFirst is not null)
        {
            db.SubmissionFeedbacks.Add(new SubmissionFeedback
            {
                SubmissionId = gracesFirst.Id,
                MentorId = mentor.Id,
                Comment = "Grace, this is a wonderful reflection — I can see real growth. Keep leaning into that daily rhythm!",
            });
        }

        // ── Prayer wall (mix of approved + pending) ────────────────────────
        db.PrayerRequests.AddRange(
            new PrayerRequest { CohortId = cohort.Id, AuthorId = grace.Id,  Content = "Please pray for my final exams next week.", Status = PrayerRequestStatus.Approved, ModeratedByUserId = mentor.Id, ModeratedAt = DateTime.UtcNow.AddDays(-2) },
            new PrayerRequest { CohortId = cohort.Id, AuthorId = samuel.Id, Content = "Praise report — my dad started coming to church!", Status = PrayerRequestStatus.Approved, ModeratedByUserId = mentor.Id, ModeratedAt = DateTime.UtcNow.AddDays(-1) },
            new PrayerRequest { CohortId = cohort.Id, AuthorId = hannah.Id, Content = "Pray for wisdom as I lead my small group.", Status = PrayerRequestStatus.Pending },
            new PrayerRequest { CohortId = cohort.Id, AuthorId = caleb.Id,  Content = "Struggling with consistency in the mornings — pray for discipline.", Status = PrayerRequestStatus.Pending });

        // ── An announcement from the mentor ────────────────────────────────
        db.Announcements.Add(new Announcement
        {
            CohortId = cohort.Id,
            AuthorId = mentor.Id,
            Title = "Welcome to Week 2!",
            Content = "Great job finishing week one, everyone. This week we're focusing on prayer — don't miss the teaching video, and remember our group call on Thursday.",
        });

        await db.SaveChangesAsync();
    }

    private void AddBadge(Dictionary<BadgeType, int> catalogue, string studentId, BadgeType type)
    {
        if (catalogue.TryGetValue(type, out var badgeId))
            db.StudentBadges.Add(new StudentBadge { StudentId = studentId, BadgeId = badgeId, EarnedAt = DateTime.UtcNow.AddDays(-3) });
    }

    private async Task<ApplicationUser> CreateUser(string email, string first, string last, string role, DateOnly dob)
    {
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = first,
            LastName = last,
            DateOfBirth = dob,
            Timezone = "UTC",
            Status = UserStatus.Active,
            EmailConfirmed = true,
        };
        await userManager.CreateAsync(user, Password);
        await userManager.AddToRoleAsync(user, role);
        return user;
    }
}
