-- ============================================================================
-- Obra Management — Member Creative Role
-- Adds a single "creative position" label for members (photographer, etc.),
-- mirroring how creative_head_role works for Creative Heads.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run once. Purely additive — does not touch existing columns/tables.
-- ============================================================================

-- 1. Add the column (snake_case values, matching duties.duty_type convention).
alter table public.profiles
  add column if not exists member_role text not null default 'none';

-- 2. Constrain to the allowed creative positions (+ 'none' = unassigned).
--    Drop first so the migration is re-runnable.
alter table public.profiles
  drop constraint if exists profiles_member_role_check;

alter table public.profiles
  add constraint profiles_member_role_check
  check (member_role in (
    'photographer',
    'videographer',
    'video_editor',
    'photo_editor',
    'graphic_designer',
    'animator',
    'none'
  ));

-- ----------------------------------------------------------------------------
-- Notes:
-- - Default 'none' means existing members keep working immediately (unassigned).
-- - member_role is only meaningful for system_role = 'member'. Consultants and
--   Creative Heads keep 'none' (Creative Heads use creative_head_role instead).
-- - No RLS change needed: profiles policies already govern this row. The field
--   is written only through the service-role API routes (create / update member),
--   so members cannot set their own position from the browser.
-- ----------------------------------------------------------------------------
