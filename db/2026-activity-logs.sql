-- ============================================================================
-- Obra Management — Activity Logs Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run.
--
-- Design (agreed 2026-07-02):
--   • HYBRID logging — the trigger below audits every write made by an
--     authenticated user (covers the ~20 client-side mutation components).
--     Service-role writes carry no auth.uid(), so the API routes that make
--     them log explicitly through lib/activityLog.ts instead. This split
--     avoids duplicate entries and anonymous "system" rows.
--   • Scope: profiles (admin actions only — self-edits skipped), events,
--     duties, workload_marks, announcements, academic_years,
--     academic_year_members, member_applications. Checklist ticks and
--     profile_skills are intentionally NOT audited (noise).
--   • Detail: field-level old→new diffs, with sensitive/long fields redacted
--     to a bare "changed" marker.
--   • Retention: current + previous academic year, pruned opportunistically
--     on ~2% of writes (same self-cleaning pattern as rate_limits).
--   • Visibility: consultants only (RLS SELECT policy).
--
-- Note on cascades: deleting an event cascade-deletes its duties, and each
-- cascaded duty row fires this trigger too — so one event deletion can log
-- several 'deleted' duty entries. Deliberate: the audit shows the full blast
-- radius of a delete.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table (may already exist from the original dashboard setup)
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  action       text not null,
  target_table text not null,
  target_id    uuid,
  details      jsonb,
  created_at   timestamptz not null default now()
);

-- Actor FK: keep log rows when a profile is deleted (actor becomes null).
alter table public.activity_logs
  drop constraint if exists activity_logs_actor_id_fkey;
alter table public.activity_logs
  add constraint activity_logs_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_id_idx
  on public.activity_logs (actor_id);
create index if not exists activity_logs_target_table_idx
  on public.activity_logs (target_table);
create index if not exists activity_logs_action_idx
  on public.activity_logs (action);

-- ----------------------------------------------------------------------------
-- 2. RLS — consultants read, nobody writes from the client.
--    Inserts happen only via the SECURITY DEFINER trigger function below and
--    the service-role key (both bypass RLS), so no INSERT policy exists.
-- ----------------------------------------------------------------------------
alter table public.activity_logs enable row level security;

drop policy if exists activity_logs_select_consultant on public.activity_logs;
create policy activity_logs_select_consultant
  on public.activity_logs for select
  using (public.get_my_role() = 'consultant');

-- Belt-and-suspenders: revoke direct write grants from public-facing roles.
revoke insert, update, delete on public.activity_logs from anon;
revoke insert, update, delete on public.activity_logs from authenticated;

-- ----------------------------------------------------------------------------
-- 3. Generic audit trigger function
-- ----------------------------------------------------------------------------
create or replace function public.log_table_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := auth.uid();
  v_row       jsonb;   -- the row being logged (NEW, or OLD on delete)
  v_old       jsonb;
  v_new       jsonb;
  v_action    text;
  v_target_id uuid;
  v_label     text;
  v_diff      jsonb := '{}'::jsonb;
  v_details   jsonb;
  k           text;
  -- Values of these columns never land in the log — PII or long free text.
  -- Their diff entry becomes {"changed": true} instead of old/new values.
  redacted constant text[] := array[
    'email','canonical_email','contact_number','student_number',
    'submit_ip','user_agent','submit_meta','avatar_url',
    'motivation','notes','content','description','remarks'
  ];
  -- Bookkeeping columns skipped entirely when diffing.
  skipped constant text[] := array['id','created_at'];
begin
  -- Service-role writes (auth.uid() is null) are logged explicitly by the
  -- API routes via lib/activityLog.ts — skip here to avoid duplicates.
  if v_actor is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_target_id := (v_row->>'id')::uuid;

  -- Members editing their OWN profile (profile page, avatar upload) are not
  -- audited; admin actions on other people's profiles are.
  if tg_table_name = 'profiles' and v_target_id = v_actor then
    return null;
  end if;

  v_action := case tg_op
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    else 'deleted'
  end;

  -- Field-level diff for updates (old → new), redacting sensitive fields.
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    for k in select jsonb_object_keys(v_new) loop
      if k = any(skipped) then
        continue;
      end if;
      if v_old->k is distinct from v_new->k then
        if k = any(redacted) then
          v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('changed', true));
        else
          v_diff := v_diff || jsonb_build_object(k, jsonb_build_object(
            'old', left(coalesce(v_old->>k, '—'), 120),
            'new', left(coalesce(v_new->>k, '—'), 120)
          ));
        end if;
      end if;
    end loop;
    -- Saving a form without changing anything: nothing worth logging.
    if v_diff = '{}'::jsonb then
      return null;
    end if;
  end if;

  -- Human-readable label for the target row.
  v_label := coalesce(v_row->>'full_name', v_row->>'title', v_row->>'label');
  -- Roster + workload rows have no name of their own — borrow the member's.
  if v_label is null and tg_table_name in ('workload_marks', 'academic_year_members') then
    select full_name into v_label
    from public.profiles
    where id = coalesce((v_row->>'member_id')::uuid, (v_row->>'profile_id')::uuid);
  end if;

  v_details := jsonb_strip_nulls(jsonb_build_object(
    'target_label', v_label,
    'diff', case when v_diff = '{}'::jsonb then null else v_diff end
  ));
  -- A new workload mark's value lives in the row, not a diff — surface it.
  if tg_table_name = 'workload_marks' and tg_op = 'INSERT' then
    v_details := v_details || jsonb_build_object('mark', v_row->>'mark');
  end if;

  insert into public.activity_logs (actor_id, action, target_table, target_id, details)
  values (v_actor, v_action, tg_table_name, v_target_id, v_details);

  -- Opportunistic retention (policy: keep current + previous academic year).
  -- On ~2% of writes, drop entries older than the previous AY's start date.
  -- With fewer than two academic years the subquery is null and nothing is
  -- deleted. Caveat: a FUTURE year created early shifts the window — accepted.
  if random() < 0.02 then
    delete from public.activity_logs
    where created_at < (
      select start_date::timestamptz
      from public.academic_years
      order by start_date desc
      offset 1 limit 1
    );
  end if;

  return null;
exception when others then
  -- The audit trail must never break the write it observes.
  raise warning 'log_table_activity failed: %', sqlerrm;
  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Attach the trigger to every audited table
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'events', 'duties', 'workload_marks', 'announcements',
    'academic_years', 'academic_year_members', 'member_applications'
  ] loop
    execute format('drop trigger if exists trg_log_activity on public.%I', t);
    execute format(
      'create trigger trg_log_activity
         after insert or update or delete on public.%I
         for each row execute function public.log_table_activity()', t);
  end loop;
end $$;
