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
- Next.js (App Router, v15)
- React
- TypeScript
- Tailwind CSS v4 — uses `@import "tailwindcss"` syntax only

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

- SUPABASE_SERVICE_ROLE_KEY is server-only. Never import it in client components.
- NEXT_PUBLIC_ variables are safe for the browser.

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

## NEXT.JS 15 RULES — CRITICAL

1. `params` in dynamic routes is a Promise. Always await it:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```
Not awaiting params causes 404 on all dynamic routes. This is a known bug source.

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

Values: Photographer, Photo Editor, Videographer, Video Editor, Graphic Designer, Animator

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
created_at timestamptz

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
created_at timestamptz

Application status pipeline:
pending → shortlisted → interviewed → approved
                                    → rejected
                                    → withdrawn

RLS on member_applications:
- INSERT: anon + authenticated (public /join form)
- SELECT: consultant + creative_head only
- UPDATE: consultant (all); creative_head (stage restricted in code to pending→shortlisted only)
- DELETE: consultant only

### public.activity_logs (table exists, not yet implemented)
id uuid
actor_id uuid (FK → profiles)
action text
target_table text
target_id uuid
details jsonb
created_at timestamptz

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
│   │   └── JoinForm.tsx                  ← Client form component
│   ├── login/
│   │   └── page.tsx
│   ├── auth/
│   │   └── signout/route.ts
│   ├── api/
│   │   ├── members/
│   │   │   ├── create/route.ts           ← Admin: create auth user (service role)
│   │   │   └── archive/route.ts          ← Consultant: archive/unarchive member
│   │   └── applications/
│   │       └── create/route.ts           ← Public: submit application (anon key)
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
│       │   ├── MembersTable.tsx          ← Table + filters (client)
│       │   ├── new/page.tsx              ← Add member (Suspense + useSearchParams)
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── ToggleActiveButton.tsx
│       │       └── ArchiveMemberButton.tsx ← Archive/unarchive (consultant only)
│       ├── events/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── EventStatusManager.tsx
│       │       └── DeleteEventButton.tsx
│       ├── duties/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── DutyActions.tsx
│       │       └── ChecklistPanel.tsx
│       ├── workloads/
│       │   ├── page.tsx
│       │   ├── WorkloadMatrix.tsx
│       │   └── WorkloadCell.tsx
│       ├── announcements/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── DeleteAnnouncementButton.tsx
│       │       └── edit/
│       │           ├── page.tsx
│       │           └── EditAnnouncementForm.tsx
│       └── applications/
│           ├── page.tsx                  ← Split view list (server)
│           ├── ApplicationsClient.tsx    ← Filters + list panel (client)
│           └── [id]/
│               ├── page.tsx             ← Detail panel (server)
│               └── ApplicationActions.tsx ← Stage buttons + notes (client)
├── components/
│   ├── Sidebar.tsx
│   ├── PageWrapper.tsx
│   └── WorkloadBadge.tsx
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── admin.ts
├── middleware.ts
├── types/
│   └── database.ts
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
Text muted:      #888888 / #999999
Text faint:      #BBBBBB
Accent/Active:   #CC0000
Success:         #16a34a
Warning:         #ca8a04
Info:            #3b82f6

### Typography
Body/UI:         DM Sans, sans-serif
Monospace:       DM Mono, monospace
Display/Hero:    Bebas Neue, sans-serif

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
.page-title          26px bold, -0.5px tracking
.page-subtitle       13px muted, margin-top 3px
.section-label       10.5px uppercase, 0.08em tracking, #999
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

### Not Yet Built
- Activity Logs — activity_logs table exists, UI not built
- Final UI Polish — loading states, skeleton screens, error states, mobile

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

1. Activity Logs
   - Track: member created, event created, duty assigned, duty reviewed,
     application approved/rejected, member archived
   - Visible to Consultant (read-only)
   - activity_logs table already in schema

2. Final UI Polish + Refactor
   - Loading states and skeleton screens on all pages
   - Consistent empty states
   - Error boundary components
   - Mobile responsiveness pass
   - Reduce redundant Supabase queries