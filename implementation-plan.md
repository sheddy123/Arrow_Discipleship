# Arrows — Implementation Plan

**Document version:** 1.1  
**Status:** In progress  
**Last updated:** July 2026  
**Related documents:** `PROJECT_SCOPE.md`, `tech-stack.md`

---

## 1. Delivery phases summary

| Phase | Window | Model | Focus |
|-------|--------|-------|-------|
| Phase 1 — MVP | Months 1–3 | Free | Core platform: auth, gating, gamification, mentor tools |
| Phase 2 — Growth | Months 4–9 | Paid | Payments, video hosting, push notifications |
| Phase 3 — Scale | Month 10+ | Paid + multi-tenant | Mobile app, multi-org, AI feedback, i18n |

---

## 2. Phase 1 — MVP sprint plan

### Sprint 1 — Foundation (Weeks 1–2) ✅ Complete

**Goal:** Runnable skeleton with auth and database.

- [x] Initialise solution: `DiscipleUp.sln` with Api, Application, Domain, Infrastructure, Web projects
- [x] EF Core schema: all Phase 1 entities with migrations (`Timezone` on User, `Status` on User and PrayerRequest, `WeekUnlock` table)
- [x] ASP.NET Core Identity setup: Student, Mentor, Parent, Admin roles seeded on startup
- [x] JWT auth: login, register, refresh, logout endpoints
- [x] Parental consent flow: Pending status, parent invitation, activation endpoint
- [x] Self-service password reset: forgot-password + reset-password endpoints
- [x] OpenAPI (built-in .NET 10) + Scalar UI at `/scalar/v1`
- [x] CORS wired for Vite dev server (`http://localhost:5173`)
- [x] Vite + React + TypeScript scaffold; Tailwind CSS; React Router v6 protected routes; TanStack Query; Zustand auth store
- [x] SPA integration: Vite proxies `/api` to the .NET backend in dev; production build outputs to `wwwroot`
- [x] Login, Register (with under-13 parent-email flow), Forgot Password, Reset Password, Parental Consent Complete pages
- [~] GitHub Actions CI/CD pipeline — **deferred to post-launch**
- [~] Azure Static Web Apps + App Service provisioned — **deferred to post-launch**

**Acceptance:** ✅ User can register (including parental consent flow for under-13), log in, and receive a valid JWT.

---

### Sprint 2 — Admin CMS and cohort setup (Weeks 3–4) ✅ Complete

**Goal:** Admin can fully author and publish a cohort before any student touches it.

- [x] Admin cohort management: create cohort (name, start date, late-entry window, mentor assignment)
- [x] Content authoring: create/edit Weeks, Days, Tasks, Assignments, and devotion text per cohort
- [x] Draft/publish toggle per cohort: content invisible to students until published
- [x] Student enrolment: admin enrols students; enrolment window enforced
- [x] Manual late enrolment: admin can add students after the window closes
- [x] Cohort settings: free/paid toggle (Stripe not wired yet)
- [x] Admin user management: list users, invite, change role, reset any password

**Acceptance:** ✅ Admin can create a cohort, author 4 weeks of content, publish it, and enrol students.

---

### Sprint 3 — Core student experience (Weeks 5–6) ✅ Complete

**Goal:** Students can progress through the programme day by day.

- [x] Student dashboard: progress arc, today's tasks, streak counter
- [x] Journey view: 4 week cards with locked/in-progress/completed states
- [x] Week view: day-by-day nav; devotion text; scripture callout; task checklist
- [x] Task completion: mark tasks done; optimistic UI; auto-advance day/week
- [x] Week gating: `WeekGateFilter` action filter with `WeekUnlock` short-circuit + gating SQL
- [x] Assignment submission: text entry with word count; update/resubmit support
- [x] Scripture memory tracker per week (toggle per week)
- [x] Session library: embedded YouTube/Vimeo in week right panel
- [x] TanStack Query hooks for all student-facing API calls; optimistic UI for task completion
- [x] Design applied from reference HTML (Sora/Inter fonts, dark sidebar, purple hero banner, gold streak card, 3-panel week layout)
- [~] File upload for assignments — deferred to Phase 2 (Azure Blob not yet configured)

**Acceptance:** ✅ A student can log in, see their journey, complete tasks across multiple days, submit a weekly assignment, and be blocked from Week 2 until Week 1 is fully complete.

---

### Sprint 4 — Mentor tools (Weeks 7–8) ✅ Complete

**Goal:** Mentors have full visibility and can interact with their cohort.

- [x] Mentor dashboard: cohort stats, all-student progress table, on-track/at-risk flag (stale >2 days or a week behind schedule)
- [x] Assignment review queue: read submissions, leave written feedback (pending/all filter; update existing feedback)
- [x] Individual student profile view: full progress history and submission log
- [x] Manual week unlock: mentor inserts a `WeekUnlock` row via the API; UI confirms (weeks 2–4, per student, from profile view)
- [x] Cohort announcements: broadcast message to all students (`Announcement` entity + composer + history)
- [x] Session upload: add YouTube/Vimeo link to a week's session library entry
- [x] Prayer wall moderation queue: approve/reject pending posts; pending count badge in mentor sidebar
- [x] SignalR: `CohortHub` at `/hubs/cohort`; `PrayerRequestPending` pushed to mentor group on new student post; live badge/queue refresh
- [~] Email fallback via Hangfire when mentor offline — deferred to Sprint 6 (Resend integration lands there)

**Acceptance:** ✅ Mentor can review and give feedback on assignments, moderate the prayer wall in real time, unlock a week for a specific student, and broadcast an announcement.

---

### Sprint 5 — Gamification and real-time (Weeks 9–10) ✅ Complete

**Goal:** Streaks, badges, and leaderboard are live with real-time feedback.

- [x] Streak calculation: `GamificationService` updates streak on task completion (student's local calendar day); `StreakResetJob` Hangfire recurring job runs hourly at :05, breaking streaks for the timezone group that just crossed midnight
- [x] 6 badges wired: Getting Started (3-day streak), 7-Day Warrior (7-day), Journey Finisher (all tasks + 28-day streak), First Step (first submission), Week Champion (week tasks + assignment), Perfect Week (week tasks + 7-day streak)
- [x] Badge unlock: SignalR `BadgeUnlocked` event; toast animation on client (badge email deferred to Sprint 6 with Resend)
- [x] Cohort leaderboard: ranked by streak then tasks completed; opt-in toggle on student profile page and leaderboard page
- [x] `StreakUpdated` SignalR event for real-time streak toast on task completion
- [x] Parent-facing read-only child dashboard view (`/parent`; child selector, summary banner, week progress, badges)
- [x] New pages: Leaderboard (`/leaderboard`, sidebar item), My Profile (`/profile`, badges grid + opt-in toggle)

**Acceptance:** ✅ Completing tasks updates the streak in real time; badges fire on correct triggers; leaderboard ranks correctly by streak; parent can view their child's dashboard.

---

### Sprint 6 — Notifications, jobs, and polish (Weeks 11–12) ✅ Complete

**Goal:** All Hangfire jobs running; platform is mobile-first and accessible.

- [x] Resend email integration: `ResendEmailService` (HTTP API; logs instead of sending when no API key is configured) — welcome, parental consent invite, password reset, weekly parent summary, badge unlock, task reminder, week completion alert
- [x] Hangfire jobs: `TaskReminderJob` (hourly; emails the 17:00-local timezone group with unfinished tasks), `EmailJobs.SendWeekCompletionAlertAsync` (enqueued to mentor when a week's final task lands), `ParentSummaryJob` (hourly; local Sunday 18:00 group), badge unlock email enqueued from `GamificationService`
- [x] Hangfire dashboard restricted (Admin role or loopback requests only)
- [x] PWA manifest: `manifest.webmanifest`, app icon, theme-color + apple-touch meta; installable to phone home screen
- [x] Mobile-first responsive pass: responsive grid classes across student/mentor pages, sidebar collapses to a top bar under 768px, week 3-panel stacks under 1000px, tables scroll horizontally (final device audit in Sprint 7 UAT)
- [x] Accessibility pass: `:focus-visible` outlines, keyboard-operable task checkboxes (role/aria-checked/Enter+Space), aria-labels on unlabelled controls (full WCAG scan scheduled for Sprint 7 UAT)
- [x] Prayer request wall: student post UI in week view; approved posts visible to cohort; own pending posts flagged; rejected posts hidden
- [~] EF Core global query filters for data tenancy — deferred to Sprint 7 security review (access control currently enforced per-endpoint; global filters need a current-user DbContext dependency, safer to introduce alongside the security review)

**Acceptance:** ✅ All Hangfire jobs registered and firing on schedule (visible at `/hangfire`); PWA installable; keyboard/screen-reader basics in place — automated accessibility scan to run during Sprint 7 UAT.

---

### Sprint 7 — UAT and launch (Weeks 13–14)

**Goal:** First cohort onboarded; platform stable in production.

- [ ] User acceptance testing with real mentor and pilot student group
- [ ] Performance audit: API p95 under 400ms; page load under 2s on simulated 4G
- [ ] Security review: JWT expiry, refresh rotation, signed URL expiry, file upload scanning
- [ ] Onboard first cohort: admin creates cohort, authors content, publishes, invites students
- [ ] GitHub Actions CI/CD pipeline + Azure provisioning (deferred from Sprint 1)
- [ ] Monitoring: Azure App Service health checks; Hangfire dashboard restricted to Admin role

**Acceptance:** First real cohort is live; at least 10 students have completed Day 1 without reported issues.

---

## 3. Phase 2 — Growth (Months 4–9)

Detailed sprint plan to be authored after Phase 1 launch. High-level deliverables:

| Deliverable | Notes |
|-------------|-------|
| Stripe Checkout | Per-cohort enrolment fees; free/paid toggle activates payment gate |
| Discount codes | Stripe coupons for scholarships and bursaries |
| Group pricing | Flat-fee church/school pricing covering N students |
| Bunny.net video hosting | Replace YouTube/Vimeo embeds with private adaptive streaming |
| Mentor video upload | Direct upload to Bunny.net via signed URL from mentor dashboard |
| Session archive | Filter by cohort, week, topic |
| Push notifications | OneSignal: daily task reminders, streak alerts |
| Parent PDF export | Printable weekly progress report |
| Mentor nudge button | Triggers personalised reminder email to a specific student |
| Certificate of completion | Generated PDF on day 28 completion |

---

## 4. Phase 3 — Scale (Month 10+)

| Deliverable | Notes |
|-------------|-------|
| React Native (Expo) app | iOS + Android; same .NET API backend |
| Flutterwave | Mobile money payments for African markets |
| Multi-tenant org model | Churches and schools as top-level accounts |
| Admin super-dashboard | Cross-organisation analytics |
| AI reflection feedback | Optional GPT-powered encouragement on submissions |
| Azure Application Insights | Usage analytics and error tracking |
| i18n | English, French, Swahili (initial) |

---

## 5. Pre-sprint decisions (resolved)

| Decision | Resolution |
|----------|-----------|
| Minimal APIs vs Controllers | **Controllers** chosen |
| SQL Server vs PostgreSQL | **SQL Server** (localhost in dev, Azure SQL in prod) |
| Auth0 vs ASP.NET Identity | **ASP.NET Identity** chosen |
| Under-13 access during pending state | **No access** until parent registers |
| CI/CD and Azure hosting | **Deferred to Sprint 7** |

---

*End of document — v1.1.*
