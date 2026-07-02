-- ============================================================================
-- Obra Management — Privacy Consent + Retention Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
--
-- Policy (agreed 2026-07-02, RA 10173 compliance):
--   • The /join form collects consent via a blocking modal BEFORE the first
--     server request (the OTP send). The API rejects submissions without
--     consent (lib/applicationValidation.ts).
--   • Proof of consent is stored per application: when it was given and which
--     version of the notice was shown (server-stamped, never client-supplied).
--   • Retention: rejected/withdrawn applications are deleted one (1) year
--     after the decision (reviewed_at; created_at as fallback) via the
--     consultant-run purge on /dashboard/activity — each purge is itself
--     recorded in the activity log.
-- ============================================================================

alter table public.member_applications
  add column if not exists consented_at timestamptz,
  add column if not exists consent_version text;

-- Supports the purge query (decided status + decision date).
create index if not exists member_applications_retention_idx
  on public.member_applications (status, reviewed_at);
