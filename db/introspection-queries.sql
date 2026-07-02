-- ============================================================================
-- Obra Management — Schema Introspection Queries
-- Purpose: produce everything needed to assemble the canonical db/schema.sql
-- (full DDL + RLS policies + triggers + seeds) from the live Supabase project.
--
-- HOW TO USE (Supabase Dashboard → SQL Editor):
--   Run each numbered query BY ITSELF (select the block, press Run), then
--   copy the full result (grid → export/copy) and paste it back, labeled
--   with the query number. 9 quick runs total.
--
-- These queries are read-only — they change nothing.
-- Re-run any time to check the committed schema.sql for drift.
-- ============================================================================


-- ── Query 1: All columns of all public tables ───────────────────────────────
select table_name,
       ordinal_position,
       column_name,
       data_type,
       coalesce(character_maximum_length::text, '') as max_len,
       is_nullable,
       coalesce(column_default, '') as column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- ── Query 2: Constraints (PK / FK / UNIQUE / CHECK), exact definitions ──────
select rel.relname as table_name,
       con.conname as constraint_name,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
order by rel.relname, con.contype desc, con.conname;


-- ── Query 3: Indexes ─────────────────────────────────────────────────────────
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;


-- ── Query 4: Functions in public (full definitions) ─────────────────────────
select p.proname as function_name,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;


-- ── Query 5: Triggers on public, auth, and storage tables ───────────────────
select n.nspname as schema_name,
       c.relname as table_name,
       t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('public', 'auth', 'storage')
order by n.nspname, c.relname, t.tgname;


-- ── Query 6: RLS enabled/forced per table ────────────────────────────────────
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;


-- ── Query 7: ALL RLS policies (public + storage), full expressions ──────────
select schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       coalesce(qual, '') as using_expression,
       coalesce(with_check, '') as with_check_expression
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;


-- ── Query 8: Table-level grants for the public-facing roles ─────────────────
select table_name,
       grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;


-- ── Query 9: Reference/seed data + storage buckets ───────────────────────────
select 'member_skills' as source, id::text, name, coalesce(description, '') as description
from public.member_skills
union all
select 'storage_bucket', id, name, case when public then 'public' else 'private' end
from storage.buckets
order by source, name;
