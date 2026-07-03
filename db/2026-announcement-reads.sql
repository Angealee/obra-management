-- ============================================================================
-- Obra Management — Announcement Read Receipts Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
--
-- Two-tier tracking (agreed 2026-07-03):
--   • SEEN — recorded automatically when an audience member opens the
--     announcement detail page (row exists).
--   • ACKNOWLEDGED — the member explicitly clicked "Acknowledge"
--     (acknowledged_at set).
-- One row per (announcement × member). Consultants and creative heads see
-- "Acknowledged X of Y · Seen Z" with names; members only ever see their own
-- state (RLS below).
--
-- Deliberately NOT audited by the activity-log trigger (high-volume,
-- low-signal — same reasoning as duty_checklists).
-- ============================================================================

create table if not exists public.announcement_reads (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  seen_at         timestamptz not null default now(),
  acknowledged_at timestamptz,          -- null = seen only
  unique (announcement_id, profile_id)
);

create index if not exists announcement_reads_announcement_idx
  on public.announcement_reads (announcement_id);

alter table public.announcement_reads enable row level security;

-- Read: your own receipt, or any receipt if you're an admin.
drop policy if exists announcement_reads_select on public.announcement_reads;
create policy announcement_reads_select
  on public.announcement_reads for select
  using (
    profile_id = auth.uid()
    or public.get_my_role() in ('consultant', 'creative_head')
  );

-- Write: only your OWN receipt — nobody can mark someone else as having read.
drop policy if exists announcement_reads_insert on public.announcement_reads;
create policy announcement_reads_insert
  on public.announcement_reads for insert
  with check (profile_id = auth.uid());

drop policy if exists announcement_reads_update on public.announcement_reads;
create policy announcement_reads_update
  on public.announcement_reads for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- No DELETE policy: receipts are append-only from the client's perspective.
