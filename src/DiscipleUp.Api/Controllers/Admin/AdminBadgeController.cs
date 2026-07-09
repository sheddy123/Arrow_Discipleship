using DiscipleUp.Api.Models;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Domain.Enums;
using DiscipleUp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiscipleUp.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/badges")]
[Authorize(Roles = "Admin")]
public class AdminBadgeController(AppDbContext db) : ControllerBase
{
    // GET api/admin/badges — the whole badge catalogue (built-in + custom)
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var earnedCounts = await db.StudentBadges
            .GroupBy(sb => sb.BadgeId)
            .Select(g => new { BadgeId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BadgeId, x => x.Count, ct);

        var badges = await db.Badges.OrderBy(b => b.Id).ToListAsync(ct);

        return Ok(badges.Select(b => ToDto(b, earnedCounts.GetValueOrDefault(b.Id))));
    }

    // POST api/admin/badges — create a custom, criterion-driven badge
    [HttpPost]
    public async Task<IActionResult> Create(CreateBadgeRequest req, CancellationToken ct)
    {
        if (req.Criterion == BadgeCriterion.None)
            return BadRequest(new { error = "Choose what the badge is awarded for." });

        var badge = new Badge
        {
            Type = BadgeType.Custom,
            Name = req.Name.Trim(),
            Description = req.Description.Trim(),
            IconUrl = string.IsNullOrWhiteSpace(req.IconUrl) ? null : req.IconUrl.Trim(),
            Criterion = req.Criterion,
            Threshold = req.Threshold,
        };
        db.Badges.Add(badge);
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(badge, 0));
    }

    // PUT api/admin/badges/{id} — edit a badge. Built-in badges keep their
    // criterion/threshold (those are code-driven); only their labels change.
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateBadgeRequest req, CancellationToken ct)
    {
        var badge = await db.Badges.FindAsync([id], ct);
        if (badge is null) return NotFound();

        badge.Name = req.Name.Trim();
        badge.Description = req.Description.Trim();
        badge.IconUrl = string.IsNullOrWhiteSpace(req.IconUrl) ? null : req.IconUrl.Trim();

        if (badge.Type == BadgeType.Custom)
        {
            if (req.Criterion == BadgeCriterion.None)
                return BadRequest(new { error = "Choose what the badge is awarded for." });
            badge.Criterion = req.Criterion;
            badge.Threshold = req.Threshold;
        }

        await db.SaveChangesAsync(ct);
        var earned = await db.StudentBadges.CountAsync(sb => sb.BadgeId == id, ct);
        return Ok(ToDto(badge, earned));
    }

    // DELETE api/admin/badges/{id} — only custom badges may be removed; built-in
    // ones are referenced by the award engine.
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var badge = await db.Badges.FindAsync([id], ct);
        if (badge is null) return NotFound();
        if (badge.Type != BadgeType.Custom)
            return BadRequest(new { error = "Built-in badges can't be deleted." });

        // Remove students' earned records for this badge first.
        await db.StudentBadges.Where(sb => sb.BadgeId == id).ExecuteDeleteAsync(ct);
        db.Badges.Remove(badge);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static BadgeDto ToDto(Badge b, int earnedCount) => new(
        b.Id, b.Type.ToString(), b.Name, b.Description, b.IconUrl,
        b.Criterion.ToString(), b.Threshold,
        b.Type == BadgeType.Custom, earnedCount);
}
