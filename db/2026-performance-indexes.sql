-- ============================================================================
-- Performance — Foreign-key & filter indexes for the core domain tables
-- ============================================================================
-- Fully ADDITIVE and idempotent (CREATE INDEX IF NOT EXISTS). It does NOT alter
-- or delete any column, row, constraint, or policy. Safe to run more than once.
--
-- Why: Postgres does NOT auto-create indexes on foreign keys. Every year-scoped
-- read in the app filters on these columns (events.academic_year_id,
-- duties.event_id, etc.). Without indexes those are sequential scans — fine at a
-- handful of rows, but the standard thing to add before real data lands.
--
-- Notes on what is intentionally NOT added here:
--   - public.academic_year_members(academic_year_id) / (profile_id)
--     already exist (db/2026-academic-year-members.sql).
--   - workload_marks(member_id, event_id) and profile_skills(profile_id, skill_id)
--     each have a UNIQUE constraint, which already indexes the LEADING column
--     (member_id / profile_id). We add the trailing column on its own below,
--     because filtering by event_id / skill_id alone cannot use that index.
--
-- Run this once in the Supabase SQL editor (or via your migration tooling).
-- At this data size each statement completes effectively instantly.
-- ============================================================================

-- ── events ──────────────────────────────────────────────────────────────────
-- Filtered by year on the dashboard, events, duties, and workloads pages.
create index if not exists idx_events_academic_year on public.events(academic_year_id);
create index if not exists idx_events_created_by     on public.events(created_by);

-- ── duties ──────────────────────────────────────────────────────────────────
-- event_id      → year scoping (now via events!inner join) + workload matrix
-- assigned_to   → "my duties" (member dashboard, duties list)
-- assigned_by   → "duties I assigned" (creative-head dashboard)
-- reviewed_by   → review attribution lookups
create index if not exists idx_duties_event_id    on public.duties(event_id);
create index if not exists idx_duties_assigned_to on public.duties(assigned_to);
create index if not exists idx_duties_assigned_by on public.duties(assigned_by);
create index if not exists idx_duties_reviewed_by on public.duties(reviewed_by);

-- ── duty_checklists ─────────────────────────────────────────────────────────
-- Loaded per duty on the duty detail page.
create index if not exists idx_duty_checklists_duty_id on public.duty_checklists(duty_id);

-- ── workload_marks ──────────────────────────────────────────────────────────
-- event_id alone is NOT covered by the UNIQUE(member_id, event_id) constraint.
create index if not exists idx_workload_marks_event_id on public.workload_marks(event_id);

-- ── announcements ───────────────────────────────────────────────────────────
create index if not exists idx_announcements_academic_year on public.announcements(academic_year_id);
create index if not exists idx_announcements_posted_by     on public.announcements(posted_by);

-- ── member_applications ─────────────────────────────────────────────────────
-- status            → "pending applications" stat + filters
-- academic_year_id  → year-scoped application list
create index if not exists idx_member_applications_status        on public.member_applications(status);
create index if not exists idx_member_applications_academic_year on public.member_applications(academic_year_id);
create index if not exists idx_member_applications_reviewed_by   on public.member_applications(reviewed_by);

-- ── profile_skills ──────────────────────────────────────────────────────────
-- skill_id alone is NOT covered by the UNIQUE(profile_id, skill_id) constraint.
create index if not exists idx_profile_skills_skill_id on public.profile_skills(skill_id);

-- ── profiles ────────────────────────────────────────────────────────────────
-- Members/workloads pages filter with `system_role <> 'consultant'` and
-- `is_active = true`. A small composite supports both.
create index if not exists idx_profiles_role_active on public.profiles(system_role, is_active);

-- ============================================================================
-- Optional: after running, you can confirm a query uses an index with e.g.
--   explain analyze
--   select * from public.duties where event_id = '<some-uuid>';
-- and looking for "Index Scan" instead of "Seq Scan".
-- ============================================================================
