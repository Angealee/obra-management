# Obra Management System

Internal web application for **Obra Creative Media Productions** — a student
organization under the College of Computer Studies (CCS) at Dominican College of
Tarlac (DCT), Philippines.

It manages members, events, duty assignments, workload tracking, announcements,
and membership applications, all scoped to an **Academic Year**.

> **Deep technical reference:** [`CLAUDE.md`](./CLAUDE.md) is the authoritative
> spec for the schema, RLS patterns, and conventions. This README is the
> practical setup + overview guide.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, **React Compiler** enabled |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) + an inline-style design system |
| Backend | Supabase — PostgreSQL, Auth (email + password), Row Level Security, Storage |
| Email | Nodemailer over Gmail SMTP (OTP verification, password reset) |
| Icons / Fonts | lucide-react · DM Sans, DM Mono, Bebas Neue |
| PWA | Web manifest + service worker (installable, offline app shell) |
| Hosting | Vercel (frontend) · Supabase (backend) |

---

## Features

- **Role-based access** — Consultant (super admin), Creative Head (subtypes:
  producer / writer / director), and Member, enforced by RLS + UI gating.
- **Academic-year scoping** — a system-wide year picker (cookie-backed) scopes
  members, events, duties, announcements, applications, and dashboard stats.
- **Members** — roster per year, skills, roles, archive/unarchive, profile photos.
- **Events & Duties** — events with assignable duties, checklists, priorities,
  and a review workflow. Events get calendar-leaf date blocks, relative-time
  labels, a "Happening" strip, per-event staffing coverage, and a month
  calendar view; duties get due-date urgency chips ("Overdue by 2 days"),
  deadline-first sorting, and inline Start/Done quick actions.
- **Workload Matrix** — per-member / per-event workload marks.
- **Announcements** — visibility-scoped posts with unread indicators, pinning,
  and This Week / Earlier grouping.
- **Membership Applications** — public `/join` form with OTP email verification,
  a split-view review console, per-reviewer scoring, duplicate detection, and
  submission forensics.
- **Dashboards** — role-specific analytics, top-contributor ranking.
- **Reports** — print-optimized (letterhead + save-as-PDF) and CSV exports:
  year workload summary, events summary, per-member accomplishment report.
- **Announcement read receipts** — auto "seen" on open plus an explicit
  Acknowledge button; admins see who has/hasn't read each post.
- **Web push notifications** — announcements, duty assignments, new events,
  duty outcomes, and new applications (admins), with per-category preferences,
  delivered even when the app is closed. Sends happen server-side (`after()`),
  dead subscriptions self-prune, and browser subscription rotation is handled.
  While the app is open, pushes render as in-app banners instead of hitting
  the OS notification bar.
- **Activity log** — a tamper-resistant audit trail (DB trigger + API logging)
  with field-level diffs, visible to consultants.
- **Privacy compliance** — RA 10173 consent modal on `/join` with server-stamped
  proof and a one-year retention purge for rejected/withdrawn applications.
- **Security** — enforced CSP + HSTS, per-account rate limiting, honeypot,
  disposable-email assessment, and a manual block list.
- **Installable PWA** — add-to-home-screen, custom install prompt, offline
  fallback, and update notifications.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (URL + anon key + service-role key)
- A Gmail account with an **App Password** (requires 2-Step Verification) for
  transactional email

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never exposed to the browser

# Transactional email (Gmail SMTP)
GMAIL_USER=your-address@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password       # no spaces

# OTP hashing pepper (server-only)
OTP_PEPPER=a-long-random-secret

# Web Push (generate once with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key           # server-only
VAPID_SUBJECT=mailto:your-contact@example.com

# Vercel Cron auth (any long random string; Vercel sends it automatically)
CRON_SECRET=a-long-random-secret
```

> **Keep the VAPID keypair stable.** Regenerating it silently invalidates every
> existing push subscription — all users would have to re-enable notifications.

> `NEXT_PUBLIC_*` values are exposed to the browser by design. Everything else is
> server-only — never import `SUPABASE_SERVICE_ROLE_KEY` into a client component.

### 3. Apply the database migrations

Run the SQL files in [`db/`](./db) in your Supabase SQL editor. Order matters in
a few cases (e.g. `2026-academic-year-members.sql` must run before the members
pages work):

| File | Purpose |
|---|---|
| `2026-academic-year-members.sql` | Per-year roster table + backfill (run first) |
| `2026-member-role.sql` | Member primary-role column |
| `2026-profile-self-edit.sql` | Profile self-service policies |
| `2026-auth-features.sql` | Password reset / auth helpers |
| `2026-join-forensics.sql` | Application submission forensics |
| `2026-security-hardening.sql` | Rate-limit / OTP / block-list tables + RLS |
| `2026-performance-indexes.sql` | Hot-path indexes (run after the above) |
| `2026-activity-logs.sql` | Audit trail: table + SECURITY DEFINER trigger + retention |
| `2026-privacy-consent.sql` | `/join` consent-proof columns + retention index |
| `2026-announcement-reads.sql` | Announcement read receipts (seen / acknowledged) |
| `2026-push-subscriptions.sql` | Web-push device subscriptions + category prefs |
| `2026-announcements-pinned.sql` | Pinned-announcements flag |

Then create the first **Consultant** account manually in the Supabase dashboard
(there is no self-signup for admins).

### 4. Run

```bash
npm run dev        # http://localhost:3000
```

> The **PWA service worker registers in production only**. To exercise install /
> offline behavior locally, use `npm run build && npm start` (localhost is a
> secure context).

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest unit suite once |
| `npm run test:watch` | Vitest in watch mode |

Unit tests live in [`tests/`](./tests) and cover pure, dependency-free logic
(no DB / no React) so they run in milliseconds. They are excluded from the
production build.

---

## Project Structure

```
app/
  layout.tsx            Root layout (PWA meta, service worker)
  manifest.ts           Web app manifest
  offline/              Offline fallback page
  join/                 Public application form (+ OTP)
  login/  auth/         Auth flows
  api/                  Service-role API routes (members, applications, auth)
  dashboard/            Authenticated app (members, events, duties, workloads,
                        announcements, applications, academic-years, profile)
components/             Sidebar, PageWrapper, YearPicker, PwaController, …
lib/supabase/           client.ts (browser) · server.ts (RSC) · admin.ts (API)
lib/                    auth, academicYear, rate-limit, email, otp, … helpers
db/                     SQL migrations (see above)
types/database.ts       Shared TypeScript types
public/                 Static assets, icons, sw.js
middleware.ts           Auth/session refresh + route guarding
```

### Supabase client usage

| File | Client | Use in |
|---|---|---|
| `lib/supabase/client.ts` | `createBrowserClient()` | `'use client'` components |
| `lib/supabase/server.ts` | `createServerClient()` + cookies | server components / layouts |
| `lib/supabase/admin.ts` | service-role client | API routes only |

---

## Deployment

- **Frontend:** Vercel. Set **all** environment variables from `.env.local` in
  Project → Settings → Environment Variables (Production, and Preview if used).
- **Backend:** Supabase (managed Postgres + Auth + Storage). Apply the `db/`
  migrations to the production project before first deploy.
- Security headers (CSP, HSTS, etc.) are defined in `next.config.ts` and applied
  to every route.

### Enabling push notifications on a deployment (checklist)

1. Run `db/2026-push-subscriptions.sql` in the Supabase SQL editor.
2. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`
   to the Vercel environment — exact values from `.env.local`, no quotes.
3. **Redeploy — and uncheck "Use existing Build Cache".** `NEXT_PUBLIC_*`
   values are inlined into the client bundle at build time; a cached build
   keeps the old (missing) value. The app also has a runtime fallback
   (`GET /api/notifications` serves the public key), so enabling still works
   from a stale bundle as long as the server env is set — but a clean build is
   the correct end state.
4. On an installed PWA, accept the **"new version available"** toast so the
   updated service worker (push handlers) activates.
5. Profile → **Enable on this device** → **Send test (4s delay)** → background
   the app → the notification must arrive with the app closed.

Platform truth: Android/desktop browsers support Web Push fully. **iOS requires
16.4+ AND the app installed to the Home Screen** — a plain Safari tab cannot
receive push; this is an Apple platform restriction, not an app limitation.

### Scheduled reminders (Vercel Cron)

`vercel.json` schedules `GET /api/cron/duty-reminders` daily at 01:00 UTC
(09:00 Asia/Manila): members with unfinished duties due **tomorrow** get a push
(one deep-linked reminder, or a single summary when several are due). Set
`CRON_SECRET` in the Vercel env — Vercel sends it as `Authorization: Bearer …`
automatically, and the endpoint refuses to run without it. Trigger a manual
test run with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/duty-reminders
```

---

## Contributing

This is an internal tool for Obra Creative Media Productions. When making
changes, follow the conventions in [`CLAUDE.md`](./CLAUDE.md) — especially the
Next.js 15+ rules (awaiting `params`, Suspense around `useSearchParams`), the RLS
patterns (`get_my_role()`), and the server-vs-client component split.
