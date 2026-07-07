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

// ── Controllers + OpenAPI ─────────────────────────────────────────────────────
builder.Services.AddScoped<WeekGateFilter>();
builder.Services.AddControllers(opts => opts.Filters.Add<WeekGateFilter>());
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
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    // TODO Sprint 6: restrict dashboard to Admin role
});

// Fallback for React Router client-side navigation
app.MapFallbackToFile("index.html");

app.Run();
