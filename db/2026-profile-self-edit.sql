-- Additive migration: lets members customize their own profile
-- (birthday, portfolio/social link) and manage their own skills.
-- Safe to re-run. Does not modify any existing columns, tables, or data.

-- 1. New optional profile fields ------------------------------------------------
alter table public.profiles
  add column if not exists birthday date;

alter table public.profiles
  add column if not exists portfolio_url text;

-- 2. Allow members to manage their own profile_skills rows ----------------------
-- (Reading skills, and reading/writing other members' profile_skills, continues
--  to go through the existing consultant/creative_head service-role API routes,
--  which use the admin client and bypass RLS entirely.)

alter table public.profile_skills enable row level security;

drop policy if exists "profile_skills_select_all" on public.profile_skills;
create policy "profile_skills_select_all"
  on public.profile_skills for select
  to authenticated
  using (true);

drop policy if exists "profile_skills_insert_own" on public.profile_skills;
create policy "profile_skills_insert_own"
  on public.profile_skills for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "profile_skills_delete_own" on public.profile_skills;
create policy "profile_skills_delete_own"
  on public.profile_skills for delete
  to authenticated
  using (profile_id = auth.uid());

-- Also let everyone read the master skills list (needed to render the
-- skill picker on the profile page).
alter table public.member_skills enable row level security;

drop policy if exists "member_skills_select_all" on public.member_skills;
create policy "member_skills_select_all"
  on public.member_skills for select
  to authenticated
  using (true);
