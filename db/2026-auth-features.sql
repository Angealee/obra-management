-- ============================================================================
-- Obra Management — Auth Features Migration
-- (Username login + Forgot Password OTP)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- password_reset_otps
--    Stores HASHED password-reset codes for existing accounts.
--    Codes are never stored in plaintext. Service-role only (no policies).
-- ----------------------------------------------------------------------------
create table if not exists public.password_reset_otps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  email       text not null,
  code_hash   text not null,                 -- sha256(code + OTP_PEPPER)
  expires_at  timestamptz not null,
  attempts    int  not null default 0,       -- failed verification attempts
  consumed    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists password_reset_otps_user_id_idx
  on public.password_reset_otps (user_id);
create index if not exists password_reset_otps_created_at_idx
  on public.password_reset_otps (created_at);

alter table public.password_reset_otps enable row level security;
-- No policies on purpose: only the service-role key (API routes) may touch it.

-- ----------------------------------------------------------------------------
-- Notes:
-- - Username login does not require a schema change. profiles.username
--   already exists and is unique; resolution from username -> email happens
--   in /api/auth/resolve-login using the service-role client (which can read
--   any profile, bypassing RLS — needed because the user isn't authenticated
--   yet at login time).
-- - Archived/inactive accounts (member_status='archived' or is_active=false)
--   are blocked from forgot-password and signed out immediately if they log
--   in successfully — enforced in application code, no RLS change needed.
-- ----------------------------------------------------------------------------
