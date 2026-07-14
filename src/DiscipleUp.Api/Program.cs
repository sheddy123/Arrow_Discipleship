using System.Text;
using DiscipleUp.Api.Filters;
using DiscipleUp.Domain.Entities;
using DiscipleUp.Infrastructure.Persistence;
using DiscipleUp.Infrastructure.Services;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.SignIn.RequireConfirmedEmail = false;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT Authentication ────────────────────────────────────────────────────────
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    // SignalR sends the JWT as a query-string parameter on WebSocket connections
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(accessToken) &&
                context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// ── Hangfire ──────────────────────────────────────────────────────────────────
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHangfireServer();

// ── Application services ──────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddHttpClient<IEmailService, ResendEmailService>();
builder.Services.AddScoped<DiscipleUp.Api.Services.GamificationService>();
builder.Services.AddScoped<DiscipleUp.Api.Services.QuestService>();
builder.Services.AddScoped<DiscipleUp.Api.Services.CohortMentorService>();
builder.Services.AddScoped<DiscipleUp.Api.Jobs.StreakResetJob>();
builder.Services.AddScoped<DiscipleUp.Api.Jobs.EmailJobs>();
builder.Services.AddScoped<DiscipleUp.Api.Jobs.TaskReminderJob>();
builder.Services.AddScoped<DiscipleUp.Api.Jobs.ParentSummaryJob>();
builder.Services.AddScoped<DiscipleUp.Api.Services.DevSeeder>();

// ── Controllers + OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddScoped<WeekGateFilter>();
builder.Services.AddControllers(opts => opts.Filters.Add<WeekGateFilter>())
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

// ── CORS (Vite dev server) ────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("ViteDev", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

builder.Services.AddAuthorization();

var app = builder.Build();

// ── Migrate and seed ──────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Student", "Mentor", "Parent", "Admin" })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }

    // Dev-only demo data: test users across every role + a fully authored cohort
    if (app.Environment.IsDevelopment())
        await scope.ServiceProvider.GetRequiredService<DiscipleUp.Api.Services.DevSeeder>().SeedAsync();
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "DiscipleUp API";
        options.Theme = ScalarTheme.Purple;
    });
    app.UseCors("ViteDev");
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Serve the React SPA (production build output from DiscipleUp.Web)
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<DiscipleUp.Api.Hubs.CohortHub>("/hubs/cohort");

// Recurring jobs run hourly; each job filters to the timezone group whose
// local clock matches its target time (00:05 streak reset, 17:00 reminders,
// Sunday 18:00 parent summaries).
using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<DiscipleUp.Api.Jobs.StreakResetJob>(
        "streak-reset", job => job.RunAsync(), "5 * * * *");
    recurringJobs.AddOrUpdate<DiscipleUp.Api.Jobs.TaskReminderJob>(
        "task-reminder", job => job.RunAsync(), "0 * * * *");
    // Hourly every day — local Sunday 18:00 falls on a different UTC day per timezone
    recurringJobs.AddOrUpdate<DiscipleUp.Api.Jobs.ParentSummaryJob>(
        "parent-summary", job => job.RunAsync(), "0 * * * *");
}
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireDashboardAuthFilter()]
});

// Fallback for React Router client-side navigation
app.MapFallbackToFile("index.html");

app.Run();
