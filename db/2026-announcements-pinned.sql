-- ============================================================================
-- Obra Management — Pinned Announcements Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
--
-- Adds a `pinned` flag: pinned announcements render in their own section at
-- the top of the list with a distinct treatment. Toggled from the
-- announcement detail page by whoever can edit the post (poster/consultant —
-- the existing announcements UPDATE policy governs, no new policy needed).
-- The UI degrades gracefully until this runs (everything just unpinned).
-- ============================================================================

alter table public.announcements
  add column if not exists pinned boolean not null default false;
