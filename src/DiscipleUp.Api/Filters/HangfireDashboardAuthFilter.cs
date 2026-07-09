using Hangfire.Dashboard;

namespace DiscipleUp.Api.Filters;

/// <summary>
/// The dashboard is browser-navigated (no JWT header), so cookie/claims auth
/// isn't available. Allow authenticated Admins when present, otherwise only
/// local requests — which keeps the dashboard usable in dev and closed in prod.
/// </summary>
public class HangfireDashboardAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        if (httpContext.User.Identity?.IsAuthenticated == true && httpContext.User.IsInRole("Admin"))
            return true;

        var connection = httpContext.Connection;
        return connection.RemoteIpAddress is not null
            && (connection.RemoteIpAddress.Equals(connection.LocalIpAddress)
                || System.Net.IPAddress.IsLoopback(connection.RemoteIpAddress));
    }
}
