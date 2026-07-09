using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Services;

/// Shared logic for managing a cohort's mentors and the student→mentor
/// assignment (used by both the admin and mentor controllers).
public class CohortMentorService(AppDbContext db, UserManager<ApplicationUser> userManager)
{
    /// All mentor user-ids on a cohort: the lead (`Cohort.MentorId`) plus any
    /// additional mentors recorded as `CohortUser` rows. Distinct.
    public async Task<List<string>> GetMentorIdsAsync(int cohortId, CancellationToken ct = default)
    {
        var lead = await db.Cohorts
            .Where(c => c.Id == cohortId)
            .Select(c => c.MentorId)
            .FirstOrDefaultAsync(ct);

        var extra = await db.CohortUsers
            .Where(cu => cu.CohortId == cohortId && cu.Role == CohortRole.Mentor)
            .Select(cu => cu.UserId)
            .ToListAsync(ct);

        var ids = new HashSet<string>(extra);
        if (!string.IsNullOrEmpty(lead)) ids.Add(lead);
        return [.. ids];
    }

    /// The full roster: mentors (with their student load) and students (with the
    /// mentor they're assigned to, if any).
    public async Task<CohortRosterDto> GetRosterAsync(int cohortId, CancellationToken ct = default)
    {
        var lead = await db.Cohorts
            .Where(c => c.Id == cohortId)
            .Select(c => c.MentorId)
            .FirstOrDefaultAsync(ct);

        var mentorIds = await GetMentorIdsAsync(cohortId, ct);

        var mentorUsers = await db.Users
            .Where(u => mentorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FirstName, u.LastName, u.Email })
            .ToListAsync(ct);

        var students = await db.CohortUsers
            .Where(cu => cu.CohortId == cohortId && cu.Role == CohortRole.Student)
            .Select(cu => new
            {
                cu.User.Id,
                cu.User.FirstName,
                cu.User.LastName,
                cu.User.Email,
                MentorId = db.StudentProgresses
                    .Where(sp => sp.StudentId == cu.UserId && sp.CohortId == cohortId)
                    .Select(sp => sp.MentorId)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        var mentorNames = mentorUsers.ToDictionary(m => m.Id, m => $"{m.FirstName} {m.LastName}");

        var mentorDtos = mentorUsers
            .Select(m => new RosterMentorDto(
                m.Id, $"{m.FirstName} {m.LastName}", m.Email ?? "",
                m.Id == lead,
                students.Count(s => s.MentorId == m.Id)))
            .OrderByDescending(m => m.IsLead).ThenBy(m => m.Name)
            .ToList();

        var studentDtos = students
            .Select(s => new RosterStudentDto(
                s.Id, $"{s.FirstName} {s.LastName}", s.Email ?? "",
                s.MentorId,
                s.MentorId is not null ? mentorNames.GetValueOrDefault(s.MentorId) : null))
            .OrderBy(s => s.Name)
            .ToList();

        return new CohortRosterDto(mentorDtos, studentDtos);
    }

    /// Add a mentor to a cohort. Returns an error string, or null on success.
    public async Task<string?> AddMentorAsync(int cohortId, string mentorId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(mentorId);
        if (user is null) return "Mentor not found.";
        if (!await userManager.IsInRoleAsync(user, "Mentor"))
            return "User is not a mentor.";

        var mentorIds = await GetMentorIdsAsync(cohortId, ct);
        if (mentorIds.Contains(mentorId)) return "Mentor is already on this cohort.";

        db.CohortUsers.Add(new CohortUser { CohortId = cohortId, UserId = mentorId, Role = CohortRole.Mentor });
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// Remove a mentor from a cohort (their students become unassigned). The lead
    /// mentor can't be removed here — change the lead first. Returns error or null.
    public async Task<string?> RemoveMentorAsync(int cohortId, string mentorId, CancellationToken ct = default)
    {
        var lead = await db.Cohorts
            .Where(c => c.Id == cohortId)
            .Select(c => c.MentorId)
            .FirstOrDefaultAsync(ct);
        if (mentorId == lead)
            return "This is the lead mentor. Change the lead mentor before removing them.";

        var row = await db.CohortUsers.FirstOrDefaultAsync(
            cu => cu.CohortId == cohortId && cu.UserId == mentorId && cu.Role == CohortRole.Mentor, ct);
        if (row is null) return "Mentor is not on this cohort.";

        // Unassign any students who were assigned to this mentor.
        await db.StudentProgresses
            .Where(sp => sp.CohortId == cohortId && sp.MentorId == mentorId)
            .ExecuteUpdateAsync(s => s.SetProperty(sp => sp.MentorId, (string?)null), ct);

        db.CohortUsers.Remove(row);
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// Manually assign (or unassign, when mentorId is null) a student to a mentor.
    public async Task<string?> AssignStudentAsync(int cohortId, string studentId, string? mentorId, CancellationToken ct = default)
    {
        var progress = await db.StudentProgresses
            .FirstOrDefaultAsync(sp => sp.CohortId == cohortId && sp.StudentId == studentId, ct);
        if (progress is null) return "Student is not enrolled in this cohort.";

        if (mentorId is not null)
        {
            var mentorIds = await GetMentorIdsAsync(cohortId, ct);
            if (!mentorIds.Contains(mentorId)) return "That mentor is not on this cohort.";
        }

        progress.MentorId = mentorId;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// Balanced round-robin assignment. By default only fills in unassigned
    /// students (and any pointing at a mentor no longer on the cohort); when
    /// `redistributeAll` is true, every student is re-spread evenly. Returns the
    /// number of students whose mentor changed.
    public async Task<int> AutoAssignAsync(int cohortId, bool redistributeAll, CancellationToken ct = default)
    {
        var mentorIds = await GetMentorIdsAsync(cohortId, ct);
        if (mentorIds.Count == 0) return 0;

        var progresses = await db.StudentProgresses
            .Where(sp => sp.CohortId == cohortId)
            .OrderBy(sp => sp.Id)
            .ToListAsync(ct);

        var load = mentorIds.ToDictionary(m => m, _ => 0);
        var toAssign = new List<StudentProgress>();

        foreach (var sp in progresses)
        {
            var keepCurrent = !redistributeAll
                && sp.MentorId is not null
                && load.ContainsKey(sp.MentorId);
            if (keepCurrent) load[sp.MentorId!]++;
            else toAssign.Add(sp);
        }

        var changed = 0;
        foreach (var sp in toAssign)
        {
            // Pick the mentor with the smallest current load (stable by id).
            var target = load.OrderBy(kv => kv.Value).ThenBy(kv => kv.Key).First().Key;
            if (sp.MentorId != target) { sp.MentorId = target; changed++; }
            load[target]++;
        }

        await db.SaveChangesAsync(ct);
        return changed;
    }
}
