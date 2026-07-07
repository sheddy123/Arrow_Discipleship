using DiscipleUp.Api.Hubs;
using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DiscipleUp.Api.Controllers;

[ApiController]
[Route("api/cohorts/{cohortId:int}/prayer-wall")]
[Authorize(Roles = "Student,Mentor,Admin")]
public class PrayerWallController(AppDbContext db, IHubContext<CohortHub> hub) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private async Task<bool> IsEnrolledAsync(int cohortId) =>
        await db.CohortUsers.AnyAsync(cu => cu.UserId == UserId && cu.CohortId == cohortId);

    // GET api/cohorts/{cohortId}/prayer-wall — approved posts plus my own pending ones
    [HttpGet]
    public async Task<IActionResult> GetWall(int cohortId)
    {
        if (!await IsEnrolledAsync(cohortId)) return Forbid();
        var userId = UserId;

        var posts = await db.PrayerRequests
            .Where(pr => pr.CohortId == cohortId
                      && (pr.Status == PrayerRequestStatus.Approved
                          || (pr.AuthorId == userId && pr.Status == PrayerRequestStatus.Pending)))
            .OrderByDescending(pr => pr.CreatedAt)
            .Select(pr => new PrayerRequestDto(
                pr.Id, pr.Author.FirstName + " " + pr.Author.LastName,
                pr.Content, pr.Status.ToString(), pr.CreatedAt))
            .ToListAsync();

        return Ok(posts);
    }

    // POST api/cohorts/{cohortId}/prayer-wall
    [HttpPost]
    public async Task<IActionResult> Post(int cohortId, CreatePrayerRequestRequest request)
    {
        if (!await IsEnrolledAsync(cohortId)) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { error = "Content is required." });

        var pr = new PrayerRequest
        {
            CohortId = cohortId,
            AuthorId = UserId,
            Content = request.Content.Trim(),
        };
        db.PrayerRequests.Add(pr);
        await db.SaveChangesAsync();

        // Real-time nudge so mentors see the moderation queue grow without refreshing.
        // TODO Sprint 6: Hangfire email fallback when the mentor has no live connection.
        var author = await db.Users
            .Where(u => u.Id == pr.AuthorId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstAsync();
        await hub.Clients.Group(CohortHub.MentorGroup(cohortId))
            .SendAsync("PrayerRequestPending", new { pr.Id, cohortId, author, pr.Content, pr.CreatedAt });

        return Ok(new { pr.Id, status = pr.Status.ToString() });
    }
}
