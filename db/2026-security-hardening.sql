-- ============================================================================
-- Obra Management — Security Hardening Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run once. Review the comments before executing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. application_otps
--    Stores HASHED email verification codes for the public /join form.
--    Codes are never stored in plaintext. Service-role only (no policies).
-- ----------------------------------------------------------------------------
create table if not exists public.application_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,                 -- sha256(code + OTP_PEPPER)
  expires_at  timestamptz not null,
  attempts    int  not null default 0,       -- failed verification attempts
  consumed    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists application_otps_email_idx
  on public.application_otps (email);
create index if not exists application_otps_created_at_idx
  on public.application_otps (created_at);

alter table public.application_otps enable row level security;
-- No policies on purpose: only the service-role key (API routes) may touch it.
-- The anon/authenticated roles get zero access, which is what we want.

-- ----------------------------------------------------------------------------
-- 2. rate_limits
--    Generic, bucketed request counter used for IP/email rate limiting.
--    Each row = one request hit in a named bucket. Service-role only.
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null,                 -- e.g. "otp_send_ip:1.2.3.4"
  created_at  timestamptz not null default now()
);

create index if not exists rate_limits_bucket_created_idx
  on public.rate_limits (bucket, created_at);

alter table public.rate_limits enable row level security;
-- No policies: service-role only.

-- ----------------------------------------------------------------------------
-- 3. LOCK DOWN member_applications INSERT
--    Currently anon + authenticated can INSERT directly (the public anon key
--    is shipped to browsers, so trolls could bypass the /join form entirely
--    and POST straight to Supabase REST).
--
--    After this migration, the ONLY way to create an application is through
--    /api/applications/create, which uses the service-role key AFTER passing
--    honeypot + rate-limit + OTP + duplicate checks. The service-role key
--    bypasses RLS, so it does not need an INSERT policy.
--
--    SELECT / UPDATE / DELETE policies (consultant / creative_head) are left
--    untouched.
-- ----------------------------------------------------------------------------

-- Inspect existing INSERT policies first (optional — run on its own to see them):
--   select policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public' and tablename = 'member_applications';

-- Drop ALL existing INSERT policies on member_applications, whatever they are named:
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'member_applications'
      and cmd        = 'INSERT'
  loop
    execute format('drop policy %I on public.member_applications', pol.policyname);
  end loop;
end $$;

-- (Optional belt-and-suspenders: also revoke table-level INSERT grants from the
--  public-facing roles. Service-role is unaffected.)
revoke insert on public.member_applications from anon;
revoke insert on public.member_applications from authenticated;

-- ----------------------------------------------------------------------------
-- 4. (Optional) Housekeeping helper — purge stale OTP/rate-limit rows.
--    The app cleans up opportunistically, but if you ever want a manual sweep:
--      delete from public.application_otps where created_at < now() - interval '1 day';
--      delete from public.rate_limits   where created_at < now() - interval '1 day';
--    You can also schedule this with pg_cron if your project has it enabled.
-- ----------------------------------------------------------------------------
