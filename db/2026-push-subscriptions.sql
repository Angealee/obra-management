-- ============================================================================
-- Obra Management — Web Push Subscriptions Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
--
-- One row per (user × browser/device) push subscription. The endpoint is the
-- browser push service URL and is unique per device registration; a user with
-- a phone + laptop has two rows.
--
-- `categories` holds the user's per-category preferences. The Notifications
-- card updates ALL of a user's rows at once, so preferences follow the person
-- across devices. Sends skip a subscription when its category is false;
-- the temporary "test" category always sends.
--
-- RLS: users manage only their own subscriptions. Sending happens in API
-- routes with the service-role key (bypasses RLS). NOT audited by the
-- activity-log trigger (device-level noise, no org-data meaning).
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  categories  jsonb not null default
    '{"announcements": true, "duties": true, "events": true, "workload": true, "applications": true}'::jsonb,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select
  on public.push_subscriptions for select
  using (profile_id = auth.uid());

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert
  on public.push_subscriptions for insert
  with check (profile_id = auth.uid());

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update
  on public.push_subscriptions for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete
  on public.push_subscriptions for delete
  using (profile_id = auth.uid());
