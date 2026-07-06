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

### Sprint 2 — Admin CMS and cohort setup (Weeks 3–4) 🔄 In progress

**Goal:** Admin can fully author and publish a cohort before any student touches it.

- [ ] Admin cohort management: create cohort (name, start date, late-entry window, mentor assignment)
- [ ] Content authoring: create/edit Weeks, Days, Tasks, Assignments, and devotion text per cohort
- [ ] Draft/publish toggle per cohort: content invisible to students until published
- [ ] Student enrolment: admin invites students; enrolment window logic (5-day default)
- [ ] Manual late enrolment: admin can add students after the window closes
- [ ] Cohort settings: free/paid toggle (Stripe not wired yet)
- [ ] Admin user management: list users, invite, change role, reset any password

**Acceptance:** Admin can create a cohort, author 4 weeks of content, publish it, and enrol students.

---

### Sprint 3 — Core student experience (Weeks 5–6)

**Goal:** Students can progress through the programme day by day.

- [ ] Student dashboard: progress arc, today's tasks, streak counter
- [ ] Journey view: 4 week cards with locked/in-progress/completed states
- [ ] Week view: day-by-day tab navigation; devotion text; reflection text box
- [ ] Task completion: mark tasks done; auto-advance when all tasks complete
- [ ] Week gating: `WeekGateFilter` action filter with `WeekUnlock` short-circuit + gating SQL
- [ ] Assignment submission: text entry + file upload (photo/audio) to Azure Blob with signed URL
- [ ] Scripture memory tracker per week
- [ ] Session library: embedded YouTube/Vimeo per week
- [ ] TanStack Query hooks for all student-facing API calls; optimistic UI for task completion

**Acceptance:** A student can log in, see their journey, complete tasks across multiple days, submit a weekly assignment, and be blocked from Week 2 until Week 1 is fully complete.

---

### Sprint 4 — Mentor tools (Weeks 7–8)

**Goal:** Mentors have full visibility and can interact with their cohort.

- [ ] Mentor dashboard: cohort stats, all-student progress table, on-track/at-risk flag
- [ ] Assignment review queue: read submissions, leave written feedback
- [ ] Individual student profile view: full progress history and submission log
- [ ] Manual week unlock: mentor inserts a `WeekUnlock` row via the API; UI confirms
- [ ] Cohort announcements: broadcast message to all students
- [ ] Session upload: add YouTube/Vimeo link to a week's session library entry
- [ ] Prayer wall moderation queue: approve/reject pending posts; pending count badge on dashboard
- [ ] SignalR: `PrayerRequestPending` event pushed to mentor on new submission; email fallback via Hangfire if offline

**Acceptance:** Mentor can review and give feedback on assignments, moderate the prayer wall in real time, unlock a week for a specific student, and broadcast an announcement.

---

### Sprint 5 — Gamification and real-time (Weeks 9–10)

**Goal:** Streaks, badges, and leaderboard are live with real-time feedback.

- [ ] Streak calculation: Hangfire job at 00:05 per user timezone group; stores current streak in `StudentProgress`
- [ ] 6 badges wired: Getting Started, 7-Day Warrior, Journey Finisher, First Step, Week Champion, Perfect Week
- [ ] Badge unlock: SignalR `BadgeUnlocked` event + email to student; toast animation on client
- [ ] Cohort leaderboard: ranked by streak length; opt-in toggle on student profile
- [ ] `StreakUpdated` SignalR event for real-time streak toast on task completion
- [ ] Parent-facing read-only child dashboard view

**Acceptance:** Completing tasks updates the streak in real time; badges fire on correct triggers; leaderboard ranks correctly by streak; parent can view their child's dashboard.

---

### Sprint 6 — Notifications, jobs, and polish (Weeks 11–12)

**Goal:** All Hangfire jobs running; platform is mobile-first and accessible.

- [ ] Resend email integration: welcome, parental consent invite, password reset, weekly summary, badge unlock
- [ ] Hangfire jobs: task reminder (17:00 per user timezone), week completion alert to mentor, weekly parent summary (Sunday 18:00), badge unlock email
- [ ] PWA manifest: installable to phone home screen
- [ ] Mobile-first responsive layout audit across all student pages
- [ ] WCAG 2.1 AA accessibility pass: keyboard navigation, screen reader labels, colour contrast
- [ ] Prayer request wall: student post UI; approved posts visible to cohort; rejected posts hidden
- [ ] EF Core global query filters applied and tested for data tenancy

**Acceptance:** All Hangfire jobs fire on schedule; platform installs as PWA on iOS Safari and Android Chrome; passes automated accessibility scan.

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
