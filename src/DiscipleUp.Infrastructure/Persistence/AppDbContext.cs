using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<ParentalConsentInvite> ParentalConsentInvites => Set<ParentalConsentInvite>();
    public DbSet<Cohort> Cohorts => Set<Cohort>();
    public DbSet<CohortUser> CohortUsers => Set<CohortUser>();
    public DbSet<Week> Weeks => Set<Week>();
    public DbSet<Day> Days => Set<Day>();
    public DbSet<DiscipleTask> Tasks => Set<DiscipleTask>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<StudentProgress> StudentProgresses => Set<StudentProgress>();
    public DbSet<TaskCompletion> TaskCompletions => Set<TaskCompletion>();
    public DbSet<WeekUnlock> WeekUnlocks => Set<WeekUnlock>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionFeedback> SubmissionFeedbacks => Set<SubmissionFeedback>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<StudentBadge> StudentBadges => Set<StudentBadge>();
    public DbSet<PrayerRequest> PrayerRequests => Set<PrayerRequest>();
    public DbSet<ScriptureMemory> ScriptureMemories => Set<ScriptureMemory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<CohortUser>()
            .HasKey(cu => new { cu.CohortId, cu.UserId });

        builder.Entity<ApplicationUser>()
            .HasMany(u => u.RefreshTokens)
            .WithOne(r => r.User)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ApplicationUser>()
            .HasOne(u => u.LinkedParent)
            .WithMany()
            .HasForeignKey(u => u.LinkedParentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Entity<ParentalConsentInvite>()
            .HasOne(p => p.Student)
            .WithMany()
            .HasForeignKey(p => p.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Cohort>()
            .HasOne(c => c.Mentor)
            .WithMany()
            .HasForeignKey(c => c.MentorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<WeekUnlock>()
            .HasOne(wu => wu.UnlockedBy)
            .WithMany()
            .HasForeignKey(wu => wu.UnlockedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<WeekUnlock>()
            .HasOne(wu => wu.Student)
            .WithMany()
            .HasForeignKey(wu => wu.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<WeekUnlock>()
            .HasOne(wu => wu.Cohort)
            .WithMany()
            .HasForeignKey(wu => wu.CohortId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<TaskCompletion>()
            .HasOne(tc => tc.Student)
            .WithMany()
            .HasForeignKey(tc => tc.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<TaskCompletion>()
            .HasOne(tc => tc.Cohort)
            .WithMany()
            .HasForeignKey(tc => tc.CohortId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<TaskCompletion>()
            .HasOne(tc => tc.Task)
            .WithMany(t => t.Completions)
            .HasForeignKey(tc => tc.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<StudentProgress>()
            .HasOne(sp => sp.Student)
            .WithMany(u => u.StudentProgresses)
            .HasForeignKey(sp => sp.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<StudentProgress>()
            .HasOne(sp => sp.Cohort)
            .WithMany()
            .HasForeignKey(sp => sp.CohortId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Submission>()
            .HasOne(s => s.Student)
            .WithMany()
            .HasForeignKey(s => s.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Submission>()
            .HasOne(s => s.Cohort)
            .WithMany()
            .HasForeignKey(s => s.CohortId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<SubmissionFeedback>()
            .HasOne(sf => sf.Mentor)
            .WithMany()
            .HasForeignKey(sf => sf.MentorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Session>()
            .HasOne(s => s.AddedBy)
            .WithMany()
            .HasForeignKey(s => s.AddedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<PrayerRequest>()
            .HasOne(pr => pr.Author)
            .WithMany()
            .HasForeignKey(pr => pr.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<PrayerRequest>()
            .HasOne(pr => pr.ModeratedBy)
            .WithMany()
            .HasForeignKey(pr => pr.ModeratedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<PrayerRequest>()
            .HasOne(pr => pr.Cohort)
            .WithMany()
            .HasForeignKey(pr => pr.CohortId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<StudentBadge>()
            .HasOne(sb => sb.Student)
            .WithMany(u => u.StudentBadges)
            .HasForeignKey(sb => sb.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<ScriptureMemory>()
            .HasOne(sm => sm.Student).WithMany().HasForeignKey(sm => sm.StudentId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ScriptureMemory>()
            .HasOne(sm => sm.Week).WithMany().HasForeignKey(sm => sm.WeekId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ScriptureMemory>()
            .HasIndex(sm => new { sm.StudentId, sm.WeekId }).IsUnique();

        // Seed badge catalogue
        builder.Entity<Badge>().HasData(
            new Badge { Id = 1, Type = BadgeType.GettingStarted, Name = "Getting Started", Description = "Complete a 3-day streak" },
            new Badge { Id = 2, Type = BadgeType.SevenDayWarrior, Name = "7-Day Warrior", Description = "Complete a 7-day streak" },
            new Badge { Id = 3, Type = BadgeType.JourneyFinisher, Name = "Journey Finisher", Description = "Complete a 28-day streak and finish Day 28" },
            new Badge { Id = 4, Type = BadgeType.FirstStep, Name = "First Step", Description = "Submit your first assignment" },
            new Badge { Id = 5, Type = BadgeType.WeekChampion, Name = "Week Champion", Description = "Complete all 7 days and submit the assignment for a week" },
            new Badge { Id = 6, Type = BadgeType.PerfectWeek, Name = "Perfect Week", Description = "Complete every task on every day of a week with no missed days" }
        );
    }
}
