# Arrows — Tech Stack

**Document version:** 1.0  
**Status:** Draft  
**Last updated:** July 2026  
**Related documents:** `PROJECT_SCOPE.md`, `implementation-plan.md`

---

## 1. Technology choices

| Layer            | Technology                   | Rationale                                                                           |
| ---------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| Frontend         | React 18 + Vite + TypeScript | Developer familiarity; fast builds; SPA suits gated routing                         |
| Styling          | Tailwind CSS + shadcn/ui     | Rapid youth-friendly UI; accessible components out of the box                       |
| Data fetching    | TanStack Query v5            | Typed API calls, caching, optimistic UI for task completion                         |
| Client routing   | React Router v6              | Protected routes for gated week content                                             |
| Backend          | ASP.NET Core 8 Web API       | Developer's primary skill; robust, production-ready                                 |
| ORM              | Entity Framework Core 8      | Code-first migrations; familiar to the .NET engineer                                |
| Database         | SQL Server (Azure SQL)       | Native .NET fit; EF Core migrations; free dev tier                                  |
| Authentication   | ASP.NET Core Identity + JWT  | Role-based auth (Student, Mentor, Parent, Admin); refresh token rotation            |
| Real-time        | ASP.NET Core SignalR         | Badge unlocks, streak toasts, live leaderboard updates, mentor prayer notifications |
| Background jobs  | Hangfire                     | Streak calculations, daily reminders, weekly parent emails                          |
| File storage     | Azure Blob Storage           | Student assignment uploads; private signed URLs per student                         |
| Email            | Resend (.NET SDK)            | Transactional emails — welcome, parental consent invite, weekly summary, reminders  |
| Payments         | Stripe.NET                   | Phase 2 cohort fees, discount codes, group pricing                                  |
| Video hosting    | Bunny.net                    | Phase 2 private session recordings with adaptive streaming                          |
| Frontend hosting | Azure Static Web Apps        | Free tier; pairs with App Service in same Azure portal                              |
| API hosting      | Azure App Service            | One-click deploy from Visual Studio / GitHub Actions                                |
| CI/CD            | GitHub Actions               | Build, test, migrate, and deploy on every push to main                              |

---

## 2. Open infrastructure decision

**SQL Server vs PostgreSQL**
SQL Server is the default choice given its native EF Core fit and Azure SQL managed service. PostgreSQL on Azure (Flexible Server) is a lower-cost alternative and worth evaluating before sprint 1 if the Phase 1 infrastructure budget is constrained.

**Owner:** Lead dev — **Due:** Before sprint 1

---

## 3. Solution layout

```
DiscipleUp.sln
├── src/
│   ├── DiscipleUp.Api/                  # ASP.NET Core Web API
│   │   ├── Controllers/                 # or MinimalApis/
│   │   ├── Filters/                     # WeekGateFilter (checks WeekUnlocks then gating SQL)
│   │   ├── Hubs/                        # SignalR CohortHub
│   │   └── Program.cs
│   ├── DiscipleUp.Application/          # Business logic, CQRS commands/queries
│   ├── DiscipleUp.Domain/               # Entities, domain events, enums
│   │   ├── Entities/
│   │   │   ├── User.cs                  # Includes Timezone (IANA) and Status fields
│   │   │   ├── Cohort.cs
│   │   │   ├── CohortUser.cs
│   │   │   ├── Week.cs
│   │   │   ├── Day.cs
│   │   │   ├── Task.cs
│   │   │   ├── Assignment.cs
│   │   │   ├── Submission.cs
│   │   │   ├── SubmissionFeedback.cs
│   │   │   ├── StudentProgress.cs
│   │   │   ├── TaskCompletion.cs
│   │   │   ├── WeekUnlock.cs            # Manual gate override rows
│   │   │   ├── Badge.cs
│   │   │   ├── StudentBadge.cs
│   │   │   ├── PrayerRequest.cs         # Includes Status enum: Pending | Approved | Rejected
│   │   │   └── Session.cs
│   │   └── Enums/
│   ├── DiscipleUp.Infrastructure/       # EF Core, Hangfire, Blob, Email, Stripe
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs
│   │   │   └── Migrations/
│   │   ├── Jobs/                        # Hangfire job classes
│   │   ├── Storage/                     # Azure Blob signed URL helpers
│   │   └── Email/                       # Resend integration
│   └── DiscipleUp.Web/                  # React + Vite (built output served separately)
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/                   # TanStack Query hooks per domain
│       │   ├── api/                     # Typed fetch clients
│       │   └── main.tsx
│       └── vite.config.ts
└── tests/
    ├── DiscipleUp.Api.Tests/
    ├── DiscipleUp.Application.Tests/
    └── DiscipleUp.Integration.Tests/
```

---

## 4. Architectural notes

**Minimal APIs vs Controllers**
An open decision (see `PROJECT_SCOPE.md` §13, item 1). Controllers are the default recommendation given team familiarity. Minimal APIs can be adopted later for specific lightweight endpoints without a full migration.

**EF Core query filters**
Global query filters on `StudentProgress`, `Submission`, `TaskCompletion`, and `PrayerRequest` enforce data-tenancy at the ORM level so that student data is never accidentally returned across cohort or user boundaries.

**WeekGateFilter execution order**

1. Check `WeekUnlocks` table for a matching row (StudentId + CohortId + WeekNumber). If found, short-circuit and allow.
2. Run the gating SQL to verify all prior-week tasks and assignments are complete.
3. If neither condition passes, return `403 Forbidden` with a structured error body the client uses to show the locked-week UI.

**Hangfire timezone grouping**
The nightly streak job groups users by UTC offset and schedules a sub-job for each group that fires at 00:05 local time. This avoids running a single monolithic job at server midnight that misattributes streaks for users in different regions.

**SignalR connection for offline mentors**
When a prayer request is submitted and the mentor has no active SignalR connection, the `PrayerRequestPending` event falls through to a Hangfire-queued email notification so no moderation request is silently dropped.
