using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DiscipleUp.Api.Hubs;

[Authorize]
public class CohortHub : Hub
{
    public static string CohortGroup(int cohortId) => $"cohort-{cohortId}";
    public static string MentorGroup(int cohortId) => $"cohort-{cohortId}-mentors";

    public Task JoinCohort(int cohortId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, CohortGroup(cohortId));

    public Task JoinMentorGroup(int cohortId)
    {
        // Only mentors and admins receive moderation events
        if (Context.User?.IsInRole("Mentor") != true && Context.User?.IsInRole("Admin") != true)
            return Task.CompletedTask;
        return Groups.AddToGroupAsync(Context.ConnectionId, MentorGroup(cohortId));
    }

    public Task LeaveCohort(int cohortId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, CohortGroup(cohortId));
}
