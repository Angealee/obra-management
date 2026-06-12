-- ============================================================================
-- Phase 1 — Academic-Year Membership ("who is active for a given year")
-- ============================================================================
-- Fully ADDITIVE. This script:
--   1. Creates one new table: public.academic_year_members
--   2. Adds CHECK constraints, indexes, and RLS policies
--   3. Backfills existing members into the CURRENTLY ACTIVE academic year
--
-- It does NOT alter or delete any existing column, row, table, or policy.
-- It is safe to run more than once (idempotent via IF NOT EXISTS / ON CONFLICT).
--
-- Model notes:
--   - A profile is ONE login that persists across years.
--   - system_role (consultant / creative_head / member) stays GLOBAL on profiles
--     because it governs login permissions + RLS. It is NOT stored per-year here.
--   - This table records, per academic year: the member's creative position
--     (member_role) and their participation status that year.
--   - Vocabulary in the UI: a member is "active for" a year (no enroll/join/apply).
-- ============================================================================

create table if not exists public.academic_year_members (
  id               uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id)       on delete cascade,
  member_role      text not null default 'none',
  status           text not null default 'active',
  created_at       timestamptz not null default now(),
  unique (academic_year_id, profile_id)
);

-- Mirror the allowed values used on profiles -------------------------------------
alter table public.academic_year_members
  drop constraint if exists aym_member_role_check;
alter table public.academic_year_members
  add constraint aym_member_role_check
  check (member_role in (
    'photographer','videographer','video_editor','photo_editor',
    'graphic_designer','animator','none'
  ));

alter table public.academic_year_members
  drop constraint if exists aym_status_check;
alter table public.academic_year_members
  add constraint aym_status_check
  check (status in ('active','inactive','archived'));

-- Indexes for the year-scoped lookups Phase 2 will run --------------------------
create index if not exists idx_aym_year    on public.academic_year_members(academic_year_id);
create index if not exists idx_aym_profile on public.academic_year_members(profile_id);

-- Row Level Security ------------------------------------------------------------
alter table public.academic_year_members enable row level security;

-- Read: any authenticated user (mirrors how the members list is visible in-app).
drop policy if exists "aym_select_all" on public.academic_year_members;
create policy "aym_select_all"
  on public.academic_year_members for select
  to authenticated
  using (true);

-- Write: consultant only. Service-role API routes bypass RLS regardless; this
-- blocks members/heads from editing rosters via the browser client.
drop policy if exists "aym_write_consultant" on public.academic_year_members;
create policy "aym_write_consultant"
  on public.academic_year_members for all
  to authenticated
  using (public.get_my_role() = 'consultant')
  with check (public.get_my_role() = 'consultant');

-- ============================================================================
-- Backfill: make every current non-consultant member "active for" the ACTIVE
-- year, copying their existing creative role + status. If no year is active,
-- this inserts nothing (the cross join yields no rows) — perfectly safe.
-- ============================================================================
insert into public.academic_year_members (academic_year_id, profile_id, member_role, status)
select
  ay.id,
  p.id,
  coalesce(p.member_role, 'none'),
  coalesce(p.member_status, 'active')
from public.profiles p
cross join (
  select id from public.academic_years where is_active = true limit 1
) ay
where p.system_role <> 'consultant'
on conflict (academic_year_id, profile_id) do nothing;
