# CLAUDE.md — Obra Management System

This file is the authoritative reference for Claude Code and any AI assistant
working on this project. Read this entire file before making any changes.

---

## PROJECT OVERVIEW

Obra Management System is an internal web application for Obra Creative Media
Productions, a student organization under the College of Computer Studies (CCS)
at Dominican College of Tarlac (DCT), Philippines.

The system manages members, events, duty assignments, workload tracking,
announcements, and membership applications across Academic Years.

---

## TECHNOLOGY STACK — DO NOT CHANGE

Frontend:
- Next.js (App Router, v16 — React Compiler enabled in next.config.ts)
- React 19
- TypeScript
- Tailwind CSS v4 — uses `@import "tailwindcss"` syntax only

Note: Next 16 deprecates the `middleware.ts` convention in favor of `proxy.ts`
(build warning). Rename deliberately deferred — do not "fix" in passing.

Backend / Auth / Database:
- Supabase (PostgreSQL)
- Supabase Auth (email + password)
- Supabase Row Level Security (RLS)
- Supabase Storage (avatars bucket, public)

Deployment:
- Vercel (frontend)
- Supabase (backend)

Icons: lucide-react
Fonts: DM Sans, DM Mono, Bebas Neue (Google Fonts via CSS @import)

---

## ENVIRONMENT VARIABLES

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=web-push-public-key
VAPID_PRIVATE_KEY=web-push-private-key   (server-only)
VAPID_SUBJECT=mailto:contact-email
CRON_SECRET=random-string   (server-only — auths Vercel Cron → /api/cron/*)

- SUPABASE_SERVICE_ROLE_KEY and VAPID_PRIVATE_KEY are server-only. Never
  import them in client components.
- NEXT_PUBLIC_ variables are safe for the browser.
- VAPID keys were generated with `npx web-push generate-vapid-keys`; the same
  keypair must be set in the Vercel env, or existing push subscriptions break.

---

## USER ROLES

1. CONSULTANT — highest admin
   - Full access to all data
   - Manages Academic Years, Creative Heads, Members
   - Only role that can archive/unarchive members
   - Only role that can delete records
   - Can approve/reject/withdraw membership applications
   - Views activity logs

2. CREATIVE HEAD — secondary admin
   - Subtypes: creative_producer, creative_writer, creative_director
   - Creates events, assigns duties, reviews completed duties
   - Can view and add notes to membership applications
   - Can only move applications from pending → shortlisted
   - Cannot archive members

3. MEMBER — base level
   - Views own duties and events
   - Marks own duties as in progress / completed
   - Views announcements
   - Edits own profile

Role is stored in profiles.system_role.
Frontend role checks are UI-only — security is enforced by RLS.

---

## SUPABASE CLIENT USAGE

| File | Client | Use for |
|---|---|---|
| lib/supabase/client.ts | createBrowserClient() | 'use client' components |
| lib/supabase/server.ts | createServerClient() + cookies | server components, layouts |
| lib/supabase/admin.ts | createClient() + SERVICE_ROLE_KEY | API routes only |

Never use the admin client in components. Never expose SERVICE_ROLE_KEY to browser.

---

## NEXT.JS 15+ RULES — CRITICAL

1. `params` in dynamic routes is a Promise. Always await it:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```
Not awaiting params causes 404 on all dynamic routes. This is a known bug source.
`searchParams` is likewise a Promise — await it too (see /dashboard/activity,
duties, and events pages, which read ?page= and filters from it).

2. `useSearchParams()` requires a Suspense boundary:
```tsx
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InnerComponent />
    </Suspense>
  )
}
```

3. Server components cannot have event handlers (onClick, onChange, etc.).
   Use 'use client' for any component with interactivity.

4. After client-side mutations: call `router.refresh()` to re-fetch server data.
5. After login: use `window.location.href = '/dashboard'` (full reload for session).
6. Sign out: POST to /auth/signout route.

---

## RLS PATTERN

All tables have RLS enabled.

`get_my_role()` is a security definer function that returns the current user's
system_role without causing infinite recursion:

```sql
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select system_role from public.profiles where id = auth.uid()
$$;
```

Use this in all RLS policies instead of querying profiles directly.

---

## DATABASE SCHEMA

### auth.users
Managed by Supabase Auth.

### public.profiles
id uuid (FK → auth.users.id)
full_name text
email text unique
username text unique (nullable)
avatar_url text (nullable)
system_role text CHECK ('consultant','creative_head','member')
creative_head_role text CHECK ('creative_producer','creative_writer','creative_director','none')
member_role text CHECK ('photographer','videographer','video_editor','photo_editor','graphic_designer','animator','none') default 'none'
student_number text
course_section text
year_level text
contact_number text
is_active boolean default true
member_status text CHECK ('active','inactive','archived') default 'active'
created_at timestamptz

Notes:
- is_active is kept for RLS compatibility and duty assignment exclusions
- member_status is the UI source of truth for members list
- member_role is the member's single primary creative position (photographer,
  videographer, etc.) — distinct from member_skills (secondary capabilities).
  Only meaningful for system_role='member'; written only via service-role API
  routes (create/update member). Labels live in lib/memberRole.ts.
- When archiving: set member_status='archived' AND is_active=false
- When unarchiving: set member_status='active' AND is_active=true
- First consultant account is created manually in Supabase dashboard
- Members are created by admins only — no self-signup

### public.member_skills
id uuid
name text unique
description text
created_at timestamptz

Values (LIVE DATA, verified via introspection July 2026): Animation,
Graphic Design, Photo Editing, Photography, Video Editing, Videography.
NOTE: these display names deliberately differ from the member_role /
duty_type slugs (photographer, photo_editor, …) — never hard-code skill
names in filters; derive options from the data (see useMemberFilters).

### public.profile_skills (many-to-many)
id uuid
profile_id uuid (FK → profiles)
skill_id uuid (FK → member_skills)
created_at timestamptz
UNIQUE(profile_id, skill_id)

### public.academic_years
id uuid
label text unique  (e.g. "A.Y. 2026-2027")
start_date date
end_date date
is_active boolean default false
created_at timestamptz

### public.academic_year_members
id uuid
academic_year_id uuid (FK → academic_years, CASCADE DELETE)
profile_id uuid (FK → profiles, CASCADE DELETE)
member_role text CHECK ('photographer','videographer','video_editor','photo_editor','graphic_designer','animator','none') default 'none'
status text CHECK ('active','inactive','archived') default 'active'
created_at timestamptz
UNIQUE(academic_year_id, profile_id)

Notes:
- Records which members are "active for" a given academic year (UI vocabulary:
  "active for [year]" — never enroll/join/apply).
- One profile = one login across all years; system_role stays GLOBAL on profiles
  (it governs login permissions/RLS). This table holds the member's per-year
  creative position (member_role) and participation status.
- Written only by consultants (RLS) / service-role API routes.
- Migration + backfill: db/2026-academic-year-members.sql (Phase 1).
- Part of the system-wide academic-year scoping work; see [[academic-year-scoping]].

### public.events
id uuid
academic_year_id uuid (FK → academic_years)
title text
description text
event_date date
event_time time
location text
status text CHECK ('upcoming','ongoing','completed','cancelled') default 'upcoming'
created_by uuid (FK → profiles)
created_at timestamptz

### public.duties
id uuid
event_id uuid (FK → events, CASCADE DELETE)
assigned_to uuid (FK → profiles)
assigned_by uuid (FK → profiles)
title text
description text
duty_type text CHECK ('photographer','photo_editor','videographer','video_editor',
'graphic_designer','animator','other')
priority text CHECK ('low','normal','high','urgent') default 'normal'
status text CHECK ('pending','in_progress','completed','reviewed') default 'pending'
due_date date
completed_at timestamptz
reviewed_by uuid (FK → profiles)
reviewed_at timestamptz
remarks text
created_at timestamptz

### public.duty_checklists
id uuid
duty_id uuid (FK → duties, CASCADE DELETE)
item_text text
is_done boolean default false
created_at timestamptz

### public.workload_marks
id uuid
member_id uuid (FK → profiles)
event_id uuid (FK → events)
mark text CHECK ('completed','late','did_not_duty')
marked_by uuid (FK → profiles)
created_at timestamptz
UNIQUE(member_id, event_id)

### public.announcements
id uuid
academic_year_id uuid (FK → academic_years)
title text
content text
posted_by uuid (FK → profiles)
visibility text CHECK ('all','creative_heads','members') default 'all'
pinned boolean default false (db/2026-announcements-pinned.sql — pinned posts
  render in their own top section; toggled on the detail page by whoever can
  edit; list UI degrades gracefully pre-migration)
created_at timestamptz

List UX (July 2026): sections Pinned → This Week → Earlier; unread posts
(audience member with no announcement_reads row) float first within each
section with a red dot + left border; visibility pills are admin-only UI.

### public.member_applications
id uuid
full_name text
email text
contact_number text
year_level text
course_section text
positions text[]
motivation text
portfolio_url text (nullable)
status text CHECK ('pending','shortlisted','interviewed','approved','rejected','withdrawn')
notes text (nullable)
reviewed_by uuid (FK → profiles, nullable)
reviewed_at timestamptz (nullable)
academic_year_id uuid (FK → academic_years, nullable)
consented_at timestamptz (nullable — when the applicant agreed to the privacy notice)
consent_version text (nullable — notice version shown; server-stamped, see lib/privacyPolicy.ts)
created_at timestamptz

Privacy (RA 10173, db/2026-privacy-consent.sql):
- /join shows a Data Privacy Notice MODAL before the OTP send (the first time
  personal data reaches the server). validateApplication rejects consent!==true.
- consented_at + consent_version are stamped by the server on insert (proof).
- Retention: rejected/withdrawn applications are deleted 1 year after the
  decision via the consultant "Data Hygiene" purge on /dashboard/activity
  (/api/applications/purge, count-then-confirm, activity-logged).

Application status pipeline:
pending → shortlisted → interviewed → approved
                                    → rejected
                                    → withdrawn

RLS on member_applications:
- INSERT: anon + authenticated (public /join form)
- SELECT: consultant + creative_head only
- UPDATE: consultant (all); creative_head (stage restricted in code to pending→shortlisted only)
- DELETE: consultant only

### public.push_subscriptions
id uuid
profile_id uuid (FK → profiles, CASCADE DELETE)
endpoint text unique (browser push-service URL; one row per user × device)
p256dh text / auth text (subscription encryption keys)
categories jsonb (per-category prefs; default all true — announcements,
  duties, events, workload, applications)
user_agent text (nullable)
created_at timestamptz

Web Push (db/2026-push-subscriptions.sql + lib/push.ts):
- VAPID keys in env (see ENVIRONMENT VARIABLES). web-push npm package.
- Service worker (public/sw.js) handles `push` (shows notification with deep
  link in data.url), `notificationclick` (focuses/opens the app; falls back to
  openWindow where WindowClient.navigate is unsupported), and
  `pushsubscriptionchange` (re-subscribes and swaps the endpoint via
  /api/push/resubscribe so rotated subscriptions don't die silently).
- TRIGGER MODEL (server-side sends): the mutation API routes perform the write
  with the CALLER's session client (RLS + audit trigger intact) and send the
  push in-process via `after()` + lib/notifyEvents — delivery never depends on
  the user's browser surviving past the mutation. Routes:
  /api/announcements/create, /api/events/create, /api/duties/create,
  /api/workloads/save (matrix save bar AND duty "Mark Outcome" share it),
  /api/applications/create (public join form → consultants).
- lib/notifyEvents.ts is the single source of audience + wording per event
  type; it re-fetches records with the service role (DB truth, best-effort).
- /api/notifications POST accepts ONLY 'test' (profile card verification
  button); the old mutation trigger types were removed 2026-07-04 after the
  server-side refactor made them redundant.
- DUE-DATE REMINDERS: vercel.json cron hits GET /api/cron/duty-reminders daily
  at 01:00 UTC (09:00 PH). It pushes assignees of unfinished duties due
  TOMORROW (grouped per member via lib/notifyEvents.notifyDutiesDueOn).
  Auth: CRON_SECRET Bearer header (Vercel sends it automatically); the route
  refuses to run when the secret is unset.
- KEY DELIVERY: NEXT_PUBLIC_VAPID_PUBLIC_KEY is inlined at BUILD time, so a
  deployment built before the env existed (or a redeploy that reused the build
  cache) ships a bundle without it. GET /api/notifications serves the public
  key from the server env at runtime and NotificationsCard falls back to it —
  "Push keys are not configured" can now only mean the SERVER env is missing.
  When adding the VAPID vars on Vercel: redeploy WITHOUT the build cache.
- lib/push.ts sendPushToProfiles(): Promise.allSettled batching, TTL 1h,
  dead-subscription pruning on 404/410, category filtering ('test' bypasses).
- UI: profile NotificationsCard (enable/disable device — new devices inherit
  the user's saved category prefs, category prefs update ALL of the user's
  rows, TEMPORARY test button — remove once proven)
  + one-time EnablePushBanner on the dashboard.
- FOREGROUND BANNER: when an app window is VISIBLE, sw.js skips the OS
  notification and posts { kind: 'PUSH_RECEIVED', payload } to the page;
  components/PushForegroundBanner.tsx (mounted in the dashboard layout)
  renders stacked in-app banners (max 3, 7s auto-dismiss, tap = deep link).
  Hidden/closed windows get the OS notification as before.
- Platform truth: iOS requires 16.4+ AND Home-Screen install; SW registers in
  production builds only (test via `npm run build && npm start` or deploy).
- RLS: users manage only their own rows; sends use service role. Not audited.
- Setup + closed-app delivery test procedure: docs/push-runbook.md.

### public.announcement_reads
id uuid
announcement_id uuid (FK → announcements, CASCADE DELETE)
profile_id uuid (FK → profiles, CASCADE DELETE)
seen_at timestamptz default now()
acknowledged_at timestamptz (nullable — null = seen only)
UNIQUE(announcement_id, profile_id)

Read receipts, two tiers (db/2026-announcement-reads.sql):
- SEEN auto-recorded when an audience member opens the announcement detail
  (client upsert with ignoreDuplicates); ACKNOWLEDGED set by the explicit
  button. Audience = active profiles matching the announcement's visibility;
  consultants are excluded from the denominator.
- RLS: members insert/update ONLY their own row; SELECT own row or any row
  for consultant/creative_head. Not audited by the activity trigger (noise).
- UI: AnnouncementReceipt bar (audience) + Read Receipts card with name lists
  (admins) on the detail page; "✓ x/y acknowledged" chips on the list page.
  All receipt UI degrades gracefully until the migration is applied.

### public.activity_logs
id uuid
actor_id uuid (FK → profiles, ON DELETE SET NULL — nullable; null = failed sign-in)
action text ('created','updated','deleted','archived','unarchived','login_failed')
target_table text (audited table name, or 'auth' for sign-in events)
target_id uuid (nullable)
details jsonb ({ target_label, diff?, mark?, identifier? })
created_at timestamptz

Audit trail — HYBRID logging (db/2026-activity-logs.sql):
- A SECURITY DEFINER trigger (log_table_activity) on profiles, events, duties,
  workload_marks, announcements, academic_years, academic_year_members, and
  member_applications logs every write by an AUTHENTICATED user (covers the
  client-side mutation components). Skips service-role writes (auth.uid() null)
  and members editing their own profile. Excluded by design: duty_checklists,
  profile_skills, public /join submissions.
- Service-role API routes log explicitly via lib/activityLog.ts (member
  create/update/archive, failed logins in login-guard).
- details.diff = field-level old→new; sensitive/long fields (email, contact,
  student number, notes, content, description, remarks, password…) record only
  {"changed": true}, never values.
- RLS: SELECT consultant only; no client write policies.
- Retention: current + previous academic year, pruned opportunistically on
  ~2% of writes inside the trigger.
- UI: /dashboard/activity (consultant only) — flat table, module/action/actor
  filters, numbered pagination (50/page).

### Storage
Bucket: avatars (public)
Path pattern: {user_id}/avatar.{ext}

---

## FILE STRUCTURE

obra-management/
├── app/
│   ├── page.tsx                          ← Landing page
│   ├── layout.tsx                        ← Root layout
│   ├── globals.css                       ← Design system
│   ├── join/
│   │   ├── page.tsx                      ← Public application form
│   │   ├── JoinForm.tsx                  ← Orchestrator (steps + OTP + consent gate)
│   │   ├── useJoinForm.ts                ← Full form state machine (draft, OTP, consent)
│   │   ├── JoinSteps.tsx / JoinVerify.tsx / JoinSuccess.tsx / joinFormShared.ts
│   │   ├── PrivacyModal.tsx              ← Data Privacy Notice modal (RA 10173)
│   │   └── Slideshow.tsx
│   ├── login/
│   │   ├── page.tsx
│   │   └── ForgotPasswordModal.tsx
│   ├── auth/
│   │   └── signout/route.ts
│   ├── api/
│   │   ├── members/
│   │   │   ├── create/route.ts           ← Admin: create auth user (service role)
│   │   │   ├── update/route.ts           ← Consultant: edit member (service role)
│   │   │   └── archive/route.ts          ← Consultant: archive/unarchive member
│   │   ├── applications/
│   │   │   ├── create/route.ts           ← Public: submit application (service role, OTP-gated)
│   │   │   ├── otp/route.ts              ← Public: send email verification code
│   │   │   ├── block/route.ts            ← Consultant: block abusive identifiers
│   │   │   └── purge/route.ts            ← Consultant: retention purge (1 yr after decision)
│   │   ├── announcements/create/route.ts ← Create announcement + push audience (after())
│   │   ├── events/create/route.ts        ← Create event + push year roster (after())
│   │   ├── duties/create/route.ts        ← Assign duties + push assignees (after())
│   │   ├── workloads/save/route.ts       ← Save marks + duty sync + push members (after())
│   │   ├── notifications/route.ts        ← LEGACY trigger + 'test' verification
│   │   ├── push/resubscribe/route.ts     ← SW pushsubscriptionchange endpoint swap
│   │   └── auth/
│   │       ├── login-guard/route.ts      ← Per-account failed-login throttle + audit log
│   │       ├── resolve-login/route.ts    ← Username → email resolution
│   │       └── forgot-password/          ← request/ + reset/ routes
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx                      ← Role-based dashboard
│       ├── profile/
│       │   ├── page.tsx
│       │   ├── AvatarUpload.tsx
│       │   ├── ProfileForm.tsx
│       │   └── PasswordForm.tsx
│       ├── academic-years/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── SetActiveButton.tsx
│       │       ├── EditAcademicYearForm.tsx
│       │       └── DeleteAcademicYearButton.tsx
│       ├── members/
│       │   ├── page.tsx                  ← Members list (server)
│       │   ├── MembersTable.tsx          ← Orchestrator (client)
│       │   ├── useMemberFilters.ts / MembersFilterBar.tsx
│       │   ├── MemberRows.tsx / memberTableShared.ts
│       │   ├── new/page.tsx              ← Add member (Suspense + useSearchParams)
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── ToggleActiveButton.tsx
│       │       └── ArchiveMemberButton.tsx ← Archive/unarchive (consultant only)
│       ├── events/                        ← "DUTIES & EVENTS" hub (admins)
│       │   ├── page.tsx                  ← Tab dispatcher: Events | All Duties (+?duty= slide-over)
│       │   ├── EventsList.tsx            ← Events tab body (Happening/Upcoming/Completed)
│       │   ├── EventsCalendar.tsx        ← ?view=calendar month grid
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx              ← Detail + duty rows + ?duty= slide-over
│       │       ├── AssignDutiesPanel.tsx ← Inline assign (lazy load → /api/duties/create)
│       │       ├── EventStatusManager.tsx
│       │       ├── DeleteEventButton.tsx
│       │       └── edit/                 ← page.tsx + EditEventForm.tsx
│       ├── duties/                        ← MEMBER-ONLY list (admins → hub redirect)
│       │   ├── page.tsx                  ← "My Duties" (heads redirect to hub ?tab=duties)
│       │   ├── DutiesBoard.tsx           ← Shared board + fetchDutiesBoardData (hub + members)
│       │   ├── DutyRowActions.tsx        ← Start/Done quick actions + View/Remove
│       │   ├── new/page.tsx              ← Standalone assign (event-agnostic; exits → hub)
│       │   └── [id]/
│       │       ├── page.tsx              ← Standalone detail (push deep-link target)
│       │       ├── DutyDetailBody.tsx    ← Shared body + fetchDutyDetail (page + slide-over)
│       │       ├── DutyActions.tsx
│       │       └── DutyDetailsForm.tsx
│       ├── workloads/
│       │   ├── page.tsx
│       │   ├── WorkLoadMatrix.tsx        ← Orchestrator (hooks + views below)
│       │   ├── useWorkloadMarks.ts       ← Marks state + save/discard + duty sync
│       │   ├── useMatrixView.ts          ← Filters/sort + per-member stats
│       │   ├── MatrixTable.tsx / MatrixMobile.tsx / MatrixToolbar.tsx
│       │   ├── MatrixSaveBar.tsx / MatrixBits.tsx / matrixTypes.ts
│       │   └── WorkLoadCell.tsx
│       ├── announcements/
│       │   ├── page.tsx                  ← List + admin "x/y acknowledged" chips
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx              ← Detail + Read Receipts card (admins)
│       │       ├── AnnouncementReceipt.tsx ← Seen-on-open + Acknowledge (audience)
│       │       ├── DeleteAnnouncementButton.tsx
│       │       └── edit/
│       │           ├── page.tsx
│       │           └── EditAnnouncementForm.tsx
│       ├── reports/
│       │   ├── page.tsx                  ← Hub (consultant + creative_head)
│       │   ├── MemberReportPicker.tsx    ← Member select → accomplishment report
│       │   ├── ReportBits.tsx            ← Letterhead header + print table
│       │   ├── ReportActions.tsx         ← Back / CSV download / print buttons
│       │   ├── workload/page.tsx         ← AY workload summary (print + CSV)
│       │   ├── events/page.tsx           ← Events summary (print + CSV)
│       │   └── member/[id]/page.tsx      ← Accomplishment report (print + CSV)
│       ├── applications/
│       │   ├── page.tsx                  ← Split view list (server)
│       │   ├── ApplicationsClient.tsx    ← Orchestrator (client)
│       │   ├── useApplicationFilters.ts / useListNavigation.ts / useBulkActions.ts
│       │   ├── ApplicationsFilterHeader.tsx / ApplicationListItem.tsx
│       │   ├── BulkConfirmModal.tsx / applicationConstants.ts / utils.ts
│       │   └── [id]/
│       │       ├── page.tsx             ← Detail panel (server)
│       │       └── ApplicationActions.tsx ← Stage buttons + notes (client)
│       └── activity/
│           ├── page.tsx                  ← Audit feed (server, consultant only)
│           ├── ActivityFilters.tsx       ← Module/action/actor selects (client)
│           └── loading.tsx
├── components/
│   ├── Sidebar.tsx                       ← Grouped nav (Operate/People/Comms/Admin) + mobile drawer
│   ├── MemberMultiSelect.tsx             ← Shared member picker (assign form + inline panel)
│   ├── SlideOver.tsx                     ← URL-param right panel (?duty= duty detail)
│   ├── PageWrapper.tsx
│   ├── WorkLoadBadge.tsx
│   ├── EmptyState.tsx                    ← Shared humanized empty state
│   ├── Skeleton.tsx                      ← Loading-skeleton primitives
│   ├── Pager.tsx                         ← Shared numbered pagination
│   ├── YearPicker.tsx                    ← View-year cookie control
│   ├── PwaController.tsx
│   └── ui/                               ← Design-system primitives
│       ├── Avatar.tsx                    ← Photo-or-initials avatar (next/image)
│       ├── StatusBadge.tsx               ← Pill + EventStatusBadge + DutyStatusBadge
│       ├── FilterPopover.tsx             ← Floating filters (no layout shift)
│       └── tokens.ts                     ← Shared card/label/row tokens (T)
├── lib/
│   ├── supabase/                         ← client.ts / server.ts / admin.ts
│   ├── auth.ts                           ← getSessionProfile / requireProfile (cached)
│   ├── academicYear.ts                   ← getAcademicYearContext (view-year cookie)
│   ├── viewYear.ts                       ← Pure view-year resolution (unit-tested)
│   ├── viewYearCookie.ts                 ← Cookie name constant (client-safe)
│   ├── activityLog.ts                    ← logActivity + buildDiff (service-role logging)
│   ├── privacyPolicy.ts                  ← CONSENT_VERSION / contact / retention days
│   ├── applicationValidation.ts          ← Server-side /join validation (+consent gate)
│   ├── emailSecurity.ts                  ← Allowlist + canonicalization + MX check
│   ├── applicationBlocks.ts / rate-limit.ts / otp.ts / email.ts
│   ├── push.ts                           ← sendPushToProfiles (VAPID, server-only)
│   ├── notifyEvents.ts                   ← Audience + wording per notification type
│   ├── dutyStatus.ts / memberRole.ts / logger.ts
├── middleware.ts                          ← Auth session refresh + redirects
├── types/
│   └── database.ts                       ← Hand-written row types (gen types pending)
├── tests/                                 ← Vitest unit tests (7 suites, pure logic)
├── vitest.config.ts
├── next.config.ts                         ← CSP + security headers + images config
└── .env.local

---

## DESIGN SYSTEM

### Colors
Background:      #F7F7F5
Sidebar:         #0D0D0D
Card bg:         #FFFFFF
Card border:     1px solid rgba(0,0,0,0.06)
Text primary:    #111111
Text secondary:  #555555
Text muted:      #6b7280  (meaningful secondary text — WCAG AA 4.6:1 on white;
                 replaced the old #777/#888/#999/#aaa tier in July 2026)
Text faint:      #BBBBBB / #CCCCCC (decorative ONLY — hints, dividers, disabled;
                 never for information the user needs to read)
Accent/Active:   #CC0000
Success:         #16a34a
Warning:         #ca8a04
Info:            #3b82f6
Name accent:     #1e40af  (--name-accent — member/user names ONLY, via the
                 PersonName treatment; 8.7:1 on white. Never for links,
                 statuses, or generic emphasis)

### Typography
Body/UI:         DM Sans, sans-serif
Monospace:       DM Mono, monospace
Display/Hero:    Bebas Neue, sans-serif

Type scale (July 2026 redesign — CSS variables in globals.css :root):
--text-display   38px   Bebas masthead greeting
--text-title     30px   page titles (.page-title)
--text-section   16px   card/section headings (.card-title)
--text-body      14px   table cells, list rows, inputs
--text-secondary 13px   sublines, descriptions
--text-caption   12px   timestamps, counts — SMALLEST readable size.
Nothing informational renders below 12px; the 10.5px uppercase
.section-label survives only as a decorative divider. Prefer the variables
over hard-coded px in new/edited styles.

Spacing rhythm (4px grid): --space-card 24px (20px below 640px),
--space-section 32px between page sections, --space-header 28px below the
page header.

### globals.css rules
- Google Fonts @import MUST be the first line, before @import "tailwindcss"
- Do not reorder these imports or fonts will break

### CSS Classes (defined in globals.css)
Layout:
.page-enter          page load animation (fade + rise)
.sidebar             collapsible sidebar
.sidebar.collapsed   collapsed state
Cards:
.dash-card           white card with border + border-radius 12px
.stat-card           hoverable stat card
.stat-card-link      link wrapper for stat-card
.announcement-card   hoverable announcement card
Typography:
.page-title          30px bold, -0.5px tracking (var(--text-title))
.page-subtitle       13px muted, margin-top 3px
.card-title          16px/600 card & section headings (var(--text-section))
.section-label       10.5px uppercase, 0.08em tracking (decorative divider only)
Navigation:
.sidebar-nav-item    nav link base style
.sidebar-nav-item.active  red left border + white text
.nav-tooltip         tooltip shown when sidebar is collapsed
Buttons:
.btn-primary         black bg, white text
.btn-secondary       transparent, border, gray text
.btn-danger          transparent, red text, red border
Forms:
.obra-input          standard text input
.obra-label          form field label
Tables:
.obra-table          full-width, borderless, hover rows

### Inline Style Convention
- Use inline styles for specific values (colors, sizes, padding, margin)
- Use Tailwind only for layout utilities (flex, grid, gap, overflow)
- Never use Tailwind for colors or font sizes — use inline styles
- This prevents Tailwind class conflicts with the design system
- EXCEPTION — components/ui/: shadcn/ui-derived primitives live here and
  arrive styled with Tailwind classes; inside components/ui/ files Tailwind
  may style everything (themed via the CSS variables in globals.css).
  Page-level code keeps the inline-style rule above.

### Card Pattern
```tsx
<div className="dash-card">
  content
</div>
```

### Layout Pattern
- Sidebar: collapsible 232px ↔ 64px, state saved in localStorage
- Main content: max-width 1100px, centered via PageWrapper
- Page transition: PageWrapper with key={pathname}

---

## KEY TECHNICAL PATTERNS

### Server vs Client Components
- Server: data fetching, protected pages, initial render, no useState/useEffect
- Client: forms, interactivity, useState, useEffect, event handlers
- Add 'use client' at the top for: useState, useEffect, useRouter, usePathname,
  onClick, onChange, and any other event handlers

### Navigation After Mutations
```ts
router.push('/dashboard/...')  // navigate
router.refresh()               // re-fetch server component data
```

### TypeScript and Supabase Types
- Supabase returns complex inferred types
- Use `as any` or `as any[]` when TypeScript conflicts with Supabase query shapes
- Do not create custom types that duplicate Supabase query shapes

### API Routes
- Use admin client (service role) only in API routes
- Always verify the caller's role server-side before performing privileged actions
- Return NextResponse.json({ error: '...' }, { status: 4xx }) for errors
- Return NextResponse.json({ success: true }) for success

### Link vs button for navigation
- Use Next.js `<Link href="...">` for navigation
- Use `<button onClick={() => window.location.href = url}>` when building
  URL strings dynamically — avoids JSX parser eating opening `<a` tags
- Use `window.open(url, '_blank')` for external links (portfolio, etc.)

### URL Prefill Pattern (Add Member from Application)
```ts
const qs = [
  'full_name=' + encodeURIComponent(value),
  'email=' + encodeURIComponent(value),
].join('&')
const url = '/dashboard/members/new?' + qs
```
Do not use URLSearchParams — it causes TypeScript JSX prop conflicts.

---

## MODULES STATUS

### Completed
- Phase 1: Auth + Setup
- Phase 2: Academic Year CRUD
- Phase 3: Member Management
- Phase 4: Event Management
- Phase 5: Duty Assignment + Checklists
- Phase 6: Dashboard Analytics
- Phase 7: Workload Matrix
- Phase 8: UI Overhaul (collapsible sidebar, page transitions)
- Phase 9: Announcements
- Phase 10: Profile Management (avatar, username, password)
- Phase 11: Members + Duties Workload Integration
- Phase 12: Member Inquiry Module (/join + applications panel)
- Phase 13: Members List Rebuild (table, filters, archive)
- Phase 14: System-wide Academic Year Scoping
- Phase 15: Activity Logs (hybrid trigger + API-route logging, consultant feed
  at /dashboard/activity — requires db/2026-activity-logs.sql migration)
- Phase 16: Privacy Consent + Retention (/join consent modal, consent proof
  columns, 1-year purge — requires db/2026-privacy-consent.sql migration)
- Phase 17: Debt Sweep (July 2026) — 56 unit tests over security-critical libs,
  exact-count dashboard stats, history pagination (duties/events, 10/page),
  decomposition of the four oversized components into hooks + view files,
  components/ui primitives (Avatar, StatusBadge, tokens), WCAG AA contrast for
  meaningful text (#6b7280), CSS hover/focus parity, next/image migration
- Phase 18: Reports Module — /dashboard/reports hub (consultant + creative
  heads): workload summary, events summary, member accomplishment report;
  each print-optimized (letterhead + @media print rules) with CSV export
  (lib/reportCsv.ts, unit-tested)
- Phase 19: Announcement Read Receipts — seen-on-open + explicit Acknowledge,
  admin name lists + list chips (requires db/2026-announcement-reads.sql)
- Phase 20: Web Push Notifications — VAPID + web-push, push_subscriptions
  table, SW push/notificationclick handlers, verified trigger endpoint
  (/api/notifications), five categories with per-user prefs, profile
  NotificationsCard + dashboard banner (requires db/2026-push-subscriptions.sql
  + VAPID env vars on Vercel)
- Phase 24: Duties & Events hub (July 2026, pre-annual-meeting overhaul) —
  /dashboard/events is now the ADMIN HUB "Duties & Events" with tabs
  Events | All Duties (?tab=duties; events history pagination stays ?page=,
  duties history uses ?dpage= — deliberately distinct). /dashboard/duties is
  MEMBER-ONLY ("My Duties"); heads are redirected to the hub tab (single
  choke point that also fixes all legacy admin links + push targets).
  DutiesBoard.tsx + fetchDutiesBoardData are shared by both surfaces.
  Assigning: inline AssignDutiesPanel on event detail (lazy member load,
  POST /api/duties/create) + the standalone /dashboard/duties/new (event-
  agnostic; exits target the hub). components/MemberMultiSelect.tsx is the
  shared picker. Duty detail: ?duty=<id> opens a SlideOver (components/
  SlideOver.tsx) on the hub + event detail for admins; /dashboard/duties/[id]
  REMAINS a full page (push deep-link target; members' normal view) via the
  shared DutyDetailBody.tsx + fetchDutyDetail. Sidebar: grouped sections
  (Operate/People/Comms/Admin, DM Mono headers; members render flat) with
  match[] prefixes so duty deep links highlight the hub item. BottomNav
  admin tabs: Home · Duties·Events · Workloads · More. Tour: duties-manage
  step docks on the hub header (route must stay pathname-only). Also in this
  pass: token-dialect restyles (events detail/new, duty detail stack,
  academic-years + activity tables, EventsList), readability floor (informational
  text ≥12px, #bbb → #6b7280, pills 12px), copy diet, requireProfile +
  Promise.all on 7 more detail pages, report tables scroll on mobile
  (.report-table-scroll, print resets it), time-aware hydration-safe
  DashboardGreeting (DM Sans 700).
- Phase 23: Dashboard identity + matrix pan (July 2026) — editorial Masthead
  (DM Mono kicker w/ red tick + Bebas Neue greeting + ghosted filmstrip band,
  opacity 0.05 w/ rightward fade mask); stat cards: Bebas numerals (34px),
  CountUp roll (components/ui/CountUp, reduced-motion aware), hover accent
  bar (.stat-accent), SVG completion Ring on Total Duties / Reviewed cards;
  NO entrance animations (user choice). Workload matrix desktop scroller is
  grab-and-pan (mouse only, 5px threshold, pointer capture + click-swallow so
  cell clicks stay safe; touch keeps native scroll).
- Phase 22: Professionalization pass (July 2026) — uniform FilterPopover
  (Members/Workloads/Activity/Applications filters float over content, zero
  layout shift); dashboard: overdue callout strip, quick-actions row,
  Latest Announcements card with unread dots, readable type scale (rows 14px,
  sublines 12.5px); EMOJI POLICY: no emoji in UI chrome or push titles —
  lucide icons only; matrix ✓/!/✗/★ cell notation is functional and stays;
  perf: parallel year-join queries (events coverage, duties marks), sidebar
  collapsed state moved to a cookie (server-rendered width, no flash),
  Google Fonts preconnect in the root layout.
- Phase 21: UX Overhaul (July 2026) — in-app foreground push banner
  (PushForegroundBanner + sw.js visible-client handoff); announcements unread
  states/pinning/date groups (db/2026-announcements-pinned.sql); events
  date-blocks + relative labels + Happening strip + staffing coverage + month
  calendar (?view=calendar) + upcoming-order fix; duties due-date urgency
  chips + due-date sorting + inline Start/Done quick actions
  (lib/relativeDate.ts + dutyUrgency are unit-tested)

### Not Yet Built / In Progress
- db/schema.sql full dump + RLS (awaiting introspection-queries.sql results)
- DB triggers for status-transition state machines (blocked on schema dump)
- Generated Supabase types (dashboard copy-paste; replaces remaining `as any`)

---

## ACADEMIC YEAR SCOPING (Phase 14)

The whole dashboard is scoped to a chosen academic year.

- **Year picker**: a cookie (`obra_view_year`) selects the "viewing year",
  defaulting to the Active year. Server helper: `lib/academicYear.ts`
  (`getAcademicYearContext()` → `{ years, viewYear, viewYearId, activeYear }`,
  wrapped in React `cache()`). Client control: `components/YearPicker.tsx`,
  rendered in the dashboard top bar for consultant + creative_head only.
  Cookie name constant lives in `lib/viewYearCookie.ts` (no server imports, so
  it is safe to import from the client component).
- **Members ↔ year**: `academic_year_members` (see schema). The members list,
  member create, and the per-member "Active for [year]" panel
  (`app/dashboard/members/[id]/MemberYearsPanel.tsx`) use it. The roster decides
  WHO appears for a year; display fields (status/role/skills) still come from the
  profile, so Archive/Edit remain the source of truth. UI vocabulary is
  "active for [year]" — never enroll/join/apply.
- **Scoped reads**: events (`academic_year_id`), announcements (year OR null),
  applications (year OR null), duties (via the year's event ids), workloads, and
  the dashboard (events, workload marks, duty counts, top contributors, member
  count) all filter by the viewing year.
- **Migration**: `db/2026-academic-year-members.sql` MUST be run before these
  pages work (members list + create query the table).

---

## KNOWN BUGS FIXED (do not reintroduce)

1. Infinite RLS recursion → use get_my_role() security definer function
2. Login redirect loop → use window.location.href not router.push after login
3. NEXT_PUBLIC_SUPABASE_URL with /rest/v1/ appended → use base URL only
4. @import order in globals.css → Google Fonts @import must be first line
5. duty_type CHECK values → use photographer/photo_editor not photography/videography
6. Event handlers in server components → move to client components
7. WorkloadCell old props → use WorkloadMatrix only in page.tsx
8. TypeScript DutyRow conflict → use `as any[]`
9. Next.js 15 params not awaited → causes 404 on all dynamic routes
10. useSearchParams without Suspense → wrap in Suspense boundary
11. <a href> tag eaten by chat copy-paste → use button with window.location.href

---

## CODING STANDARDS

When writing code:
1. Always label the file path at the top of each code block
2. Provide full file content for new files — no partial snippets
3. Use TypeScript throughout
4. Add 'use client' where required
5. Keep server components as server components
6. Use inline styles for design values, Tailwind for layout only
7. Check for: missing imports, type errors, event handlers in server components
8. For dynamic routes: type params as Promise<{ id: string }> and await
9. For new client components with URL reading: wrap in Suspense
10. use validation to catch errors that may not be reflected in IDE, etc.

When explaining:
- Explain server vs client when relevant
- Explain why RLS matters for each table
- Explain TypeScript errors in plain language
- Always warn before changes that could break existing features
- Ask clarifying questions for ambiguous requests

---

## NEXT PHASES (in order)

1. Pre-defense hardening (Phase A roadmap)
   - Full schema + RLS dump committed as db/schema.sql
   - DB triggers enforcing status-transition state machines
     (member_applications pipeline, duties status flow)

2. Final UI Polish + Refactor
   - Loading states and skeleton screens on all pages
   - Consistent empty states
   - Error boundary components
   - Mobile responsiveness pass
   - Reduce redundant Supabase queries