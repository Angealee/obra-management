-- ============================================================================
-- /join form — Forensics + Block List
-- ============================================================================
-- Additive and idempotent. Adds:
--   1. Forensic columns on member_applications (who/where a submission came from)
--   2. A canonical_email column (alias-collapsed address) for real dedupe
--   3. public.application_blocks — manual ban list (IP / email / domain)
--
-- Run once in the Supabase SQL Editor. Does not alter or delete existing data.
--
-- PRIVACY NOTE: submit_ip / user_agent / submit_meta are collected to detect and
-- stop abuse of the public form. Disclose this on the form (a line was added to
-- /join) and retain only as long as needed. This is consistent with the PH Data
-- Privacy Act's legitimate-interest basis for security.
-- ============================================================================

-- ── 1 + 2. Forensic + canonical columns on member_applications ──────────────
alter table public.member_applications add column if not exists submit_ip       text;
alter table public.member_applications add column if not exists user_agent      text;
alter table public.member_applications add column if not exists submit_meta      jsonb;
alter table public.member_applications add column if not exists canonical_email  text;

-- Indexes that power the "other submissions from this IP / device / inbox"
-- forensic lookups and the canonical-email duplicate check.
create index if not exists idx_member_apps_submit_ip      on public.member_applications(submit_ip);
create index if not exists idx_member_apps_canonical_email on public.member_applications(canonical_email);
create index if not exists idx_member_apps_device_hash
  on public.member_applications ((submit_meta->>'device_hash'));

-- ── 3. application_blocks — manual ban list ─────────────────────────────────
create table if not exists public.application_blocks (
  id          uuid primary key default gen_random_uuid(),
  block_type  text not null check (block_type in ('ip','email','domain')),
  value       text not null,
  reason      text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (block_type, value)
);

create index if not exists idx_application_blocks_value on public.application_blocks(value);

alter table public.application_blocks enable row level security;

-- Read: consultant + creative_head (so the admin UI can show block status).
drop policy if exists "app_blocks_select_admin" on public.application_blocks;
create policy "app_blocks_select_admin"
  on public.application_blocks for select
  to authenticated
  using (public.get_my_role() in ('consultant','creative_head'));

-- Writes happen through the service-role API route (/api/applications/block),
-- which verifies the caller is a consultant. No INSERT/UPDATE/DELETE policy is
-- defined here, so the browser client cannot write directly.
-- ============================================================================
