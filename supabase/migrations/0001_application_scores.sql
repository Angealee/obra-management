-- Application portfolio scoring (1-10 per reviewer, averaged in the UI)
-- Run this in the Supabase SQL editor.

create table if not exists public.application_scores (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.member_applications(id) on delete cascade,
  scored_by uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, scored_by)
);

alter table public.application_scores enable row level security;

-- Consultants and Creative Heads can view all scores
create policy "application_scores_select"
  on public.application_scores
  for select
  using (public.get_my_role() in ('consultant', 'creative_head'));

-- A reviewer can insert their own score
create policy "application_scores_insert_own"
  on public.application_scores
  for insert
  with check (
    public.get_my_role() in ('consultant', 'creative_head')
    and scored_by = auth.uid()
  );

-- A reviewer can update their own score
create policy "application_scores_update_own"
  on public.application_scores
  for update
  using (scored_by = auth.uid())
  with check (scored_by = auth.uid());

-- A reviewer can remove their own score
create policy "application_scores_delete_own"
  on public.application_scores
  for delete
  using (scored_by = auth.uid());
