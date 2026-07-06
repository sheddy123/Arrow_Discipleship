# DiscipleUp — Project Scope

**Document version:** 1.1  
**Status:** Draft  
**Last updated:** July 2026  
**Author:** TBD  
**Stakeholders:** Platform owner, lead developer, ministry leadership

> **Related documents**
> - Technology decisions and solution layout → `tech-stack.md`
> - Delivery timeline and sprint plan → `implementation-plan.md`

---

## 1. Project overview

DiscipleUp is a web-based discipleship training platform designed for pre-teens and teens (ages 11–17). It delivers structured 28-day cohort programmes (4 weeks × 7 days, colloquially referred to as "30 days") comprising daily devotions, weekly assignments, reflection exercises, live mentored sessions, and a recorded session archive.

The platform launches free for early cohorts and transitions to a paid model in Phase 2. Progress is strictly gated — students must complete each week before the next unlocks. The UI is youth-friendly, gamified, and mobile-first.

Each cohort has unique content authored by the admin before the cohort start date. Programme content is not reused or cloned between cohorts.

---

## 2. Goals

| # | Goal | Measure of success |
|---|------|--------------------|
| 1 | Deliver a structured 28-day discipleship journey | Students complete all 4 weeks with tracked daily tasks |
| 2 | Keep teens engaged through gamification | ≥70% of enrolled students complete the full programme |
| 3 | Give mentors full visibility of their cohort | Mentors can review progress, submissions, and send messages |
| 4 | Protect student data and ensure a safe environment | No direct student-to-student messaging; parental visibility |
| 5 | Transition from free to paid without platform rebuild | Stripe integration switchable per cohort |
| 6 | Build a reusable archive of past cohort recordings | Sessions searchable and filterable by cohort and week |

---

## 3. Target users

### 3.1 Students (primary)
- Age range: 11–17
- Access device: primarily mobile (phone browser / PWA)
- Technical proficiency: low — UI must be intuitive with no instruction required
- Account creation requires verified parental consent for users under 13 (see §6.5)
- A student may only be enrolled in one active cohort at a time

### 3.2 Mentors / Pastors
- Access device: primarily desktop browser
- Responsibilities: review submissions, send feedback, post announcements, upload session recordings, monitor cohort progress, moderate prayer wall
- One mentor can manage multiple cohorts

### 3.3 Parents / Guardians
- Read-only access to their child's progress
- Receive automated weekly summary emails
- Can view submitted reflections but not edit them
- Account is created as part of the student registration flow; for under-13 students, the student account remains in **Pending** status until the parent completes their own registration via an emailed invitation link

### 3.4 Platform administrator
- Full access to all cohorts and user accounts
- Can author cohort content, create cohorts, assign mentors, configure payment settings, manage recordings, and reset any user's password

---

## 4. Feature scope

### 4.1 Phase 1 — MVP (months 1–3, free)

#### Student-facing
- [x] Registration with email; parental consent flow for under-13s (see §6.5)
- [x] Login with JWT session; "remember me" on mobile
- [x] Dashboard: animated day-of-28 progress arc, today's tasks, streak counter
- [x] Journey view: 4 weekly cards with locked/in-progress/completed states
- [x] Week view: day-by-day tab navigation; daily devotion text; reflection text box
- [x] Task completion: mark tasks done; auto-advance day when all tasks complete
- [x] Week gating: Week N+1 is locked until all 7 days and all assignments in Week N are submitted
- [x] Weekly assignment submission: text entry or file upload (photo/audio)
- [x] Scripture memory tracker per week
- [x] Session library: embedded video links (YouTube/Vimeo) per week
- [x] Gamification: streak counter, 6 earnable badges, cohort leaderboard (opt-in, ranked by streak length)
- [x] Profile page: stats, earned badges, leaderboard rank
- [x] Prayer request wall: post and view cohort prayer requests (moderated by mentor)
- [x] Self-service password reset via emailed link

#### Mentor-facing
- [x] Mentor dashboard: cohort stats, all-student progress table, on-track/at-risk status
- [x] Assignment review queue: read student submissions, leave written feedback
- [x] Prayer request moderation queue: approve or reject pending posts; real-time notification badge when a new post awaits review
- [x] Cohort announcements: broadcast a message to all students in a cohort
- [x] Individual student profile view: full progress history, submission log
- [x] Manual week unlock: admin override to unlock a week for a specific student
- [x] Session upload: add a YouTube/Vimeo link to a week's session library entry

#### Parent-facing
- [x] Read-only child dashboard view
- [x] Weekly automated summary email (Hangfire job every Sunday evening)

#### Admin-facing
- [x] Cohort content management: author and edit Weeks, Days, Tasks, Assignments, and devotion text per cohort; draft/publish workflow so content can be staged before the cohort start date
- [x] Create and configure cohorts (name, start date, late-entry window, mentor assignment)
- [x] User management: invite students, assign roles, reset any user's password
- [x] Cohort settings: free or paid toggle per cohort

#### Platform
- [x] Role-based access control: Student / Mentor / Parent / Admin
- [x] Timezone stored per user at registration (IANA string, e.g. `Africa/Lagos`); streak evaluated in user's local timezone
- [x] Progress gating via ASP.NET Core action filter; checks manual unlock table before gating SQL
- [x] SignalR hub for real-time badge unlocks, streak toasts, and mentor prayer-moderation notifications
- [x] Hangfire jobs: midnight streak check (per user timezone), daily reminder email, weekly parent summary
- [x] Azure Blob Storage for file uploads with private signed URL access
- [x] Responsive layout: mobile-first, functional on desktop
- [x] PWA manifest so students can install to phone home screen

---

### 4.2 Phase 2 — Growth (months 4–9, paid)

- [ ] Stripe Checkout for per-cohort enrollment fees
- [ ] Scholarship/bursary discount codes via Stripe coupons
- [ ] Church/school group pricing: flat fee covers N students
- [ ] Bunny.net video hosting for private session recordings (replaces embedded links)
- [ ] Video upload interface for mentors (direct upload to Bunny.net via signed URL)
- [ ] Session archive: filter by cohort, week, and topic
- [ ] Push notifications via OneSignal: daily task reminders, streak alerts
- [ ] Parental dashboard PDF export: printable weekly progress report
- [ ] Mentor "nudge" button: trigger a personalised reminder email to a specific student
- [ ] Certificate of completion: generated PDF awarded on day 28

---

### 4.3 Phase 3 — Scale (month 10+)

- [ ] React Native (Expo) mobile app for iOS and Android (same .NET API backend)
- [ ] Mobile money payments: Flutterwave integration for African markets
- [ ] Multi-tenant organisation model: churches and schools as top-level accounts
- [ ] Admin super-dashboard: cross-organisation cohort analytics
- [ ] AI-assisted reflection feedback: optional GPT-powered encouragement on submissions
- [ ] Azure Application Insights for usage analytics and error tracking
- [ ] Multi-language support (i18n): English, French, Swahili (initial)

---

## 5. Out of scope (Phase 1)

- Live video calls or streaming within the platform (mentors share external meeting links)
- Direct messaging between students (safety decision — no peer-to-peer chat)
- Native iOS or Android apps (PWA covers mobile in Phase 1)
- Payment processing of any kind (Phase 2)
- Custom video hosting (YouTube/Vimeo embed only in Phase 1)
- Multi-language support
- Public-facing marketing or landing page (out-of-platform concern)
- Integration with church management systems (e.g. Planning Center, Elvanto)
- Cohort content templates or cloning between cohorts

---

## 6. Functional requirements

### 6.1 Progress gating (critical)

```
RULE: A student may not access Week N content until:
  - All 7 days of Week N-1 are marked complete
  - All assignments for Week N-1 have been submitted (not necessarily reviewed)

ENFORCEMENT:
  - API: ASP.NET Core action filter on all /api/weeks/{n}/content endpoints
    → Step 1: check WeekUnlocks table for a manual override (short-circuit if found)
    → Step 2: run gating SQL if no override exists
  - Client: Week cards display locked state; route redirect if accessed directly
  - Override: Mentor and Admin roles can insert a WeekUnlock row via the API
```

### 6.2 Streak logic

```
RULE: A streak increments when a student completes at least one task on each
      consecutive calendar day in the student's local timezone. A streak breaks
      if no tasks are completed on a given calendar day.
      
      Streak is recalculated by a Hangfire job that runs at 00:05 in each
      student's local timezone (batched by timezone offset group).

BADGES triggered by streaks:
  - 3-day streak  → "Getting Started" badge
  - 7-day streak  → "7-Day Warrior" badge
  - 28-day streak → "Journey Finisher" badge (combined with day 28 completion)
```

### 6.3 Role permissions matrix

| Action | Student | Mentor | Parent | Admin |
|--------|---------|--------|--------|-------|
| View own progress | ✓ | ✓ | ✓ | ✓ |
| View other students' progress | ✗ | own cohort | own child | ✓ |
| Submit assignment | ✓ | ✗ | ✗ | ✓ |
| Review/feedback assignment | ✗ | ✓ | ✗ | ✓ |
| Post prayer request | ✓ | ✓ | ✗ | ✓ |
| Moderate prayer wall | ✗ | ✓ | ✗ | ✓ |
| Send cohort announcement | ✗ | ✓ | ✗ | ✓ |
| Upload session recording | ✗ | ✓ | ✗ | ✓ |
| Override week gate | ✗ | ✓ | ✗ | ✓ |
| Create/manage cohorts | ✗ | ✗ | ✗ | ✓ |
| Author cohort content | ✗ | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✗ | ✓ |
| Reset own password | ✓ | ✓ | ✓ | ✓ |
| Reset any user's password | ✗ | ✗ | ✗ | ✓ |

### 6.4 Notifications (Hangfire scheduled jobs)

| Job | Schedule | Trigger |
|-----|----------|---------|
| Streak check | Daily 00:05 per user timezone | Recalculate all active student streaks |
| Task reminder | Daily 17:00 per user timezone | Email students who have not completed today's tasks |
| Week completion alert | On event | Email mentor when a student completes a full week |
| Weekly parent summary | Sunday 18:00 | Email parents with child's week recap |
| Badge unlock | On event | SignalR push + email to student on badge earn |
| Prayer request submitted | On event | SignalR push to online mentor; email if mentor is offline |

### 6.5 Parental consent and registration

```
RULE: Students registering with an age under 13 require verified parental consent
      before gaining platform access.

FLOW:
  1. Student (or parent on their behalf) completes the registration form
     → age field determines whether parental consent is required
     → if age < 13, a parent email address is a required field
  2. Student account is created with Status = Pending
  3. An invitation email is sent to the parent email address
  4. Parent clicks the link → completes their own account registration
     → their account is automatically linked to the student
  5. Student account Status changes to Active; student can now log in

ENFORCEMENT:
  - Students with Status = Pending cannot authenticate (login returns 403)
  - The consent invitation link expires after 72 hours; admin can resend
```

**Open question:** Should a student aged 13–17 be able to log in immediately on registration, or should all students require an admin/mentor to mark them as enrolled in a cohort first?

### 6.6 Cohort enrolment window

```
RULE: Each cohort has a configurable late-entry window (default: 5 days from
      the cohort start date). Students who enrol within this window gain full
      access to all content from Day 1.

AFTER THE WINDOW CLOSES:
  - Self-registration for the cohort is disabled
  - Admin can still manually add a student to a closed cohort via the
    user management interface (no access restriction)
```

### 6.7 Badge catalogue

| # | Badge name | Trigger |
|---|-----------|---------|
| 1 | Getting Started | Complete a 3-day streak |
| 2 | 7-Day Warrior | Complete a 7-day streak |
| 3 | Journey Finisher | Complete a 28-day streak and finish Day 28 |
| 4 | First Step | Submit the first assignment in the cohort |
| 5 | Week Champion | Complete all 7 days and submit the assignment for any one week |
| 6 | Perfect Week | Complete every task on every day of a week with no missed days |

**Open question:** Badges 5 and 6 may overlap for students who miss no days. Decide whether both are awarded independently or whether Perfect Week supersedes Week Champion.

### 6.8 Data lifecycle after cohort end

- Student streak, badge, and submission data persists indefinitely
- Cohort content (devotions, tasks, assignments) transitions to read-only archive status
- Archived cohorts remain accessible to enrolled students for reference
- Students may enrol in future cohorts (one at a time)
- Each new cohort contains independently authored content

---

## 7. Non-functional requirements

| Category | Requirement |
|----------|------------|
| Performance | API responses under 300ms for all standard endpoints; page load under 2s on a 4G mobile connection |
| Availability | 99.5% uptime target; Azure App Service handles auto-restart |
| Security | HTTPS enforced; JWT tokens expire after 7 days; refresh token rotation; all file uploads scanned |
| Data privacy | Student data is accessible only to the student, their assigned mentor, their parent, and admins. EF Core query filters enforce this at the data layer. |
| Safeguarding | No direct student-to-student communication. Prayer wall posts require mentor approval before visibility. Students under 13 require verified parental consent on signup. |
| Scalability | Architecture supports up to 500 concurrent users in Phase 1; designed to scale horizontally on Azure App Service in Phase 2 |
| Accessibility | WCAG 2.1 AA compliance; keyboard navigable; screen reader tested |
| Browser support | Latest 2 versions of Chrome, Safari, Edge, Firefox; iOS Safari 15+; Android Chrome 100+ |
| Compliance | COPPA (US) and POPIA/GDPR compliance required from day one for underage users |

---

## 8. Data model overview

### Core entities

```
Organisation          -- churches, schools (Phase 3 multi-tenant)
└── Cohort            -- a single 28-day programme run
    ├── CohortUser    -- links users to cohorts with a role; tracks enrolment date
    ├── Week          -- 4 weeks per cohort, each with authored content
    │   ├── Day       -- 7 days per week, each with devotion text + tasks
    │   │   └── Task           -- individual checklist items per day
    │   └── Assignment         -- weekly submission requirement
    └── Session       -- recorded sessions linked to a week

User                  -- single table; role differentiates behaviour
    Timezone          -- IANA timezone string (e.g. "Africa/Lagos"), set at registration
    Status            -- Active | Pending (Pending = awaiting parental consent)
├── StudentProgress   -- one row per student per cohort (streak, current day, current week)
├── TaskCompletion    -- one row per student per task when completed
├── WeekUnlock        -- manual override rows; checked before gating SQL
│     StudentId, CohortId, WeekNumber, UnlockedBy, UnlockedAt
├── Submission        -- assignment submissions with file reference
│   └── SubmissionFeedback  -- mentor review and written comment
├── Badge             -- catalogue of 6 earnable badges
├── StudentBadge      -- earned badges per student (with earned date)
└── PrayerRequest     -- cohort prayer wall posts
      Status          -- Pending | Approved | Rejected (students see Approved only)
```

### Week gating logic (action filter pseudocode)

```
// Step 1 — check for manual unlock
IF EXISTS (WeekUnlocks WHERE StudentId AND CohortId AND WeekNumber = requested)
  → allow access

// Step 2 — standard gate
SELECT CASE WHEN
  (all tasks in Week N-1 completed by student)
  AND
  (all assignments in Week N-1 submitted by student)
THEN 1 ELSE 0 END AS CanAccess
```

### Week gating SQL (standard gate)

```sql
SELECT CASE WHEN
  (SELECT COUNT(*) FROM TaskCompletions tc
   JOIN Tasks t ON tc.TaskId = t.Id
   JOIN Days d ON t.DayId = d.Id
   WHERE d.WeekNumber = @weekNumber - 1
   AND tc.StudentId = @studentId) =
  (SELECT COUNT(*) FROM Tasks t
   JOIN Days d ON t.DayId = d.Id
   WHERE d.WeekNumber = @weekNumber - 1)
  AND
  (SELECT COUNT(*) FROM Submissions
   WHERE WeekNumber = @weekNumber - 1
   AND StudentId = @studentId) =
  (SELECT COUNT(*) FROM Assignments
   WHERE WeekNumber = @weekNumber - 1)
THEN 1 ELSE 0 END AS CanAccess
```

---

## 9. API surface (key endpoints)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  POST   /api/auth/forgot-password
  POST   /api/auth/reset-password

Students (JWT required)
  GET    /api/students/me/dashboard
  GET    /api/students/me/progress
  GET    /api/students/me/badges

Cohorts
  GET    /api/cohorts/{cohortId}/journey
  GET    /api/cohorts/{cohortId}/weeks/{n}            ← gated by action filter
  GET    /api/cohorts/{cohortId}/weeks/{n}/days/{d}
  POST   /api/cohorts/{cohortId}/tasks/{taskId}/complete
  POST   /api/cohorts/{cohortId}/assignments/{id}/submit
  GET    /api/cohorts/{cohortId}/leaderboard          ← ranked by streak length
  GET    /api/cohorts/{cohortId}/sessions
  GET    /api/cohorts/{cohortId}/prayers              ← returns Approved only for students
  POST   /api/cohorts/{cohortId}/prayers

Mentor (Mentor role required)
  GET    /api/mentor/cohorts/{cohortId}/students
  GET    /api/mentor/submissions/pending
  POST   /api/mentor/submissions/{id}/feedback
  POST   /api/mentor/cohorts/{cohortId}/announce
  POST   /api/mentor/students/{id}/unlock-week
  POST   /api/mentor/sessions
  GET    /api/mentor/cohorts/{cohortId}/prayers/pending
  POST   /api/mentor/prayers/{id}/approve
  POST   /api/mentor/prayers/{id}/reject

Admin
  POST   /api/admin/cohorts
  PUT    /api/admin/cohorts/{id}
  GET    /api/admin/cohorts/{id}/content              ← draft content authoring
  POST   /api/admin/cohorts/{id}/weeks
  PUT    /api/admin/cohorts/{id}/weeks/{n}
  POST   /api/admin/cohorts/{id}/weeks/{n}/days
  PUT    /api/admin/cohorts/{id}/weeks/{n}/days/{d}
  POST   /api/admin/cohorts/{id}/weeks/{n}/days/{d}/tasks
  PUT    /api/admin/cohorts/{id}/assignments/{id}
  POST   /api/admin/cohorts/{id}/publish              ← publish draft content
  GET    /api/admin/users
  POST   /api/admin/users/invite
  POST   /api/admin/users/{id}/reset-password
  POST   /api/admin/students/{id}/enrol              ← manual enrolment past window

SignalR hub
  /hubs/cohort     → BadgeUnlocked, StreakUpdated, AnnouncementPosted,
                     PrayerRequestPending (mentor only)
```

---

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Student drop-off before week completion | High | High | Streak system, mentor nudge emails, engaging badge rewards |
| Safeguarding breach (underage users) | Low | Critical | Verified parental consent on signup; no peer DMs; prayer wall moderation |
| Azure costs exceed budget | Medium | Medium | Start on free tiers; set Azure cost alerts; Phase 1 cost model pending final review |
| Video storage costs spike | Medium | Medium | Bunny.net ~$0.005/GB — cap per-cohort video quota in admin settings |
| Payment handling liability (Phase 2) | Low | High | Use Stripe Checkout — card data never touches our servers |
| Content gating bypass via direct URL | Low | Medium | Server-side gate (action filter + WeekUnlock check) is authoritative; client-side is UX only |
| Timezone edge cases break streaks | Medium | Medium | Store IANA timezone per user; evaluate streaks in local time; allow mentor to manually restore a broken streak |
| Parental consent bottleneck slows onboarding | Medium | Low | 72-hour link expiry; admin can resend; mentor can flag stuck accounts |

---

## 11. Success metrics

| Metric | Phase 1 target | Phase 2 target |
|--------|---------------|---------------|
| Cohort completion rate | ≥ 60% | ≥ 70% |
| Daily active users (of enrolled) | ≥ 50% | ≥ 65% |
| Average streak length | ≥ 5 days | ≥ 8 days |
| Mentor assignment review turnaround | ≤ 48 hours | ≤ 24 hours |
| API p95 response time | ≤ 400ms | ≤ 300ms |
| Paying cohort conversion (Phase 2) | — | ≥ 40% of cohorts |

---

## 12. Assumptions and constraints

**Assumptions**
- Programme length is 4 weeks × 7 days = 28 days; "30-day" is colloquial language used in marketing and mentorship context
- Each cohort has one assigned mentor and runs on a fixed 28-day calendar from the cohort start date
- Content (devotions, tasks, assignment prompts) is authored by the admin in the platform CMS before the cohort start date, using a draft/publish workflow
- Student accounts for under-13s will have a linked parent account; the student account remains Pending until the parent registers
- Students may be enrolled in only one active cohort at a time
- The cohort late-entry window is 5 calendar days from the start date; students enrolling within this window receive full access from Day 1
- The platform launches in English only in Phase 1

**Constraints**
- Development is a solo or small-team effort — architecture must be simple to operate
- No dedicated infrastructure team — Azure managed services only (no self-managed VMs)
- Phase 1 infrastructure cost target: under review (original $10/month target to be validated against Azure pricing before sprint 1)
- COPPA and POPIA/GDPR compliance required from day one for underage users
- No self-managed video infrastructure in Phase 1 (YouTube/Vimeo embeds only)

---

## 13. Open decisions

| # | Decision | Options | Owner | Due |
|---|----------|---------|-------|-----|
| 1 | Minimal APIs vs Controllers | Controllers (familiar) vs Minimal APIs (lighter) | Lead dev | Before sprint 1 |
| 2 | PostgreSQL vs SQL Server | SQL Server (native EF Core fit) vs PostgreSQL (lower Azure cost) | Lead dev | Before sprint 1 |
| 3 | Phase 1 video strategy | YouTube embed vs Vimeo unlisted vs early Bunny.net | Stakeholder | Before cohort 1 |
| 4 | Leaderboard opt-in default | Opt-in (safer for teens) vs opt-out (higher engagement) | Ministry leadership | Before launch |
| 5 | Phase 1 infrastructure cost | Validate $10/month target against actual Azure SKU pricing | Lead dev | Before sprint 1 |
| 6 | Badge overlap (Week Champion vs Perfect Week) | Award both independently vs Perfect Week supersedes Week Champion | Product owner | Before sprint 3 |
| 7 | Under-13 access during pending state | No access until parent registers vs read-only preview access | Ministry leadership | Before sprint 1 |
| 8 | Admin late-enrolment override | Admin can add students after the 5-day window with no restrictions vs require explicit justification flag | Lead dev | Before sprint 2 |
| 9 | Cohort discovery model | Admin/mentor invites students directly vs students browse a cohort catalogue and self-enrol | Product owner | Before sprint 2 |
| 10 | Content draft workflow complexity | Simple draft/published toggle per cohort vs per-week/day granular publishing | Lead dev | Before sprint 2 |

---

*End of document — v1.1. Supersedes v1.0. All sections subject to revision following stakeholder review.*
