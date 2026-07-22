using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DiscipleUp.Infrastructure.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string html, CancellationToken ct = default);
}

/// <summary>
/// Sends transactional email through the Resend HTTP API. When no API key is
/// configured (local dev), emails are logged instead of sent so every flow
/// stays testable without a Resend account.
/// </summary>
public class ResendEmailService(
    HttpClient http,
    IConfiguration config,
    ILogger<ResendEmailService> logger) : IEmailService
{
    public async Task SendAsync(string to, string subject, string html, CancellationToken ct = default)
    {
        var apiKey = config["Resend:ApiKey"];
        var from = config["Resend:From"] ?? "DiscipleUp <onboarding@resend.dev>";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogInformation("Email (dev, not sent) → {To} | {Subject}\n{Html}", to, subject, html);
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new("Bearer", apiKey);
        request.Content = JsonContent.Create(new { from, to = new[] { to }, subject, html });

        var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Resend send failed ({Status}) for {To}: {Body}", response.StatusCode, to, body);
        }
    }
}
