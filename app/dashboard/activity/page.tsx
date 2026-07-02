import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import type { ActivityLog } from '@/types/database'
import EmptyState from '@/components/EmptyState'
import Pager from '@/components/Pager'
import Avatar from '@/components/ui/Avatar'
import { History } from 'lucide-react'
import ActivityFilters from './ActivityFilters'
import PurgeExpiredCard from './PurgeExpiredCard'

const PAGE_SIZE = 50

// target_table → module chip label / singular noun for the sentence.
const MODULE_LABEL: Record<string, string> = {
  profiles: 'Members',
  events: 'Events',
  duties: 'Duties',
  workload_marks: 'Workload',
  announcements: 'Announcements',
  academic_years: 'Academic Years',
  academic_year_members: 'Roster',
  member_applications: 'Applications',
  auth: 'Sign-in',
}
const MODULE_NOUN: Record<string, string> = {
  profiles: 'member',
  events: 'event',
  duties: 'duty',
  workload_marks: 'workload mark',
  announcements: 'announcement',
  academic_years: 'academic year',
  academic_year_members: 'roster entry',
  member_applications: 'application',
}

const ACTION_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  created:      { label: 'Created',        bg: '#f0fdf4', color: '#16a34a' },
  updated:      { label: 'Updated',        bg: '#eff6ff', color: '#3b82f6' },
  deleted:      { label: 'Deleted',        bg: '#fef2f2', color: '#CC0000' },
  archived:     { label: 'Archived',       bg: '#f3f4f6', color: '#6b7280' },
  unarchived:   { label: 'Unarchived',     bg: '#f0fdf4', color: '#16a34a' },
  login_failed: { label: 'Failed sign-in', bg: '#fef2f2', color: '#CC0000' },
}

function ActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? { label: action, bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// "Created event “Foundation Day”" / "Failed sign-in attempt for kobym"
function sentence(log: ActivityLog): string {
  if (log.action === 'login_failed') {
    return `Failed sign-in attempt for “${log.details?.identifier ?? 'unknown'}”`
  }
  if (log.details?.purged != null) {
    return `Purged ${log.details.target_label ?? `${log.details.purged} expired applications`} (retention policy)`
  }
  const verb = ACTION_STYLE[log.action]?.label ?? log.action
  const noun = MODULE_NOUN[log.target_table] ?? log.target_table
  const label = log.details?.target_label
  const mark = log.details?.mark
  const base = `${verb} ${noun}${label ? ` “${label}”` : ''}`
  return mark ? `${base} (${mark.replace(/_/g, ' ')})` : base
}

function DiffList({ diff }: { diff: NonNullable<NonNullable<ActivityLog['details']>['diff']> }) {
  const entries = Object.entries(diff)
  return (
    <details style={{ marginTop: '4px' }}>
      <summary style={{ fontSize: '11.5px', color: '#6b7280', cursor: 'pointer', userSelect: 'none' }}>
        {entries.length} field{entries.length !== 1 ? 's' : ''} changed
      </summary>
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {entries.map(([field, change]) => (
          <p key={field} style={{ fontSize: '11.5px', color: '#6b7280', fontFamily: "'DM Mono', monospace", margin: 0, overflowWrap: 'anywhere' }}>
            <span style={{ color: '#6b7280' }}>{field.replace(/_/g, ' ')}:</span>{' '}
            {change.changed
              ? <em style={{ color: '#6b7280' }}>changed</em>
              : <>{change.old ?? '—'} <span style={{ color: '#bbb' }}>→</span> <strong style={{ fontWeight: 600, color: '#555' }}>{change.new ?? '—'}</strong></>}
          </p>
        ))}
      </div>
    </details>
  )
}

// Builds /dashboard/activity?… preserving filters (join('&') per project convention).
function pageHref(filters: { module?: string; action?: string; actor?: string }, page: number) {
  const parts: string[] = []
  if (filters.module) parts.push('module=' + encodeURIComponent(filters.module))
  if (filters.action) parts.push('action=' + encodeURIComponent(filters.action))
  if (filters.actor) parts.push('actor=' + encodeURIComponent(filters.actor))
  if (page > 1) parts.push('page=' + page)
  return '/dashboard/activity' + (parts.length > 0 ? '?' + parts.join('&') : '')
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; action?: string; actor?: string; page?: string }>
}) {
  const { profile } = await requireProfile()
  if (profile.system_role !== 'consultant') redirect('/dashboard')

  const params = await searchParams
  const filterModule = params.module && MODULE_LABEL[params.module] ? params.module : ''
  const filterAction = params.action && ACTION_STYLE[params.action] ? params.action : ''
  const filterActor = params.actor ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const supabase = await createClient()

  let query = supabase
    .from('activity_logs')
    .select('*, actor:profiles(full_name, avatar_url)', { count: 'exact' })
  if (filterModule) query = query.eq('target_table', filterModule)
  if (filterAction) query = query.eq('action', filterAction)
  if (filterActor) query = query.eq('actor_id', filterActor)

  const from = (page - 1) * PAGE_SIZE
  const [{ data: logs, count }, { data: actors }] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ])

  const rows = (logs ?? []) as (ActivityLog & { actor: { full_name: string; avatar_url: string | null } | null })[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(filterModule || filterAction || filterActor)
  const filters = { module: filterModule, action: filterAction, actor: filterActor }

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Activity</h1>
        <p className="page-subtitle">
          {total === 0
            ? 'Every change made in the system is recorded here.'
            : `${total} entr${total !== 1 ? 'ies' : 'y'} · who did what, and when. Entries are kept for the current and previous academic year.`}
        </p>
      </div>

      <ActivityFilters
        modules={Object.entries(MODULE_LABEL).map(([value, label]) => ({ value, label }))}
        actions={Object.entries(ACTION_STYLE).map(([value, s]) => ({ value, label: s.label }))}
        actors={(actors ?? []).map(a => ({ value: a.id, label: a.full_name }))}
        current={filters}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title={hasFilters ? 'Nothing matches these filters' : 'No activity recorded yet'}
          description={
            hasFilters
              ? 'Try removing a filter — entries older than the previous academic year are pruned automatically.'
              : 'Entries appear here as soon as someone creates, updates, or deletes a record. Run the db/2026-activity-logs.sql migration if this stays empty after changes are made.'
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="md:hidden bg-white rounded-xl border border-black/6 overflow-hidden">
            {rows.map(log => (
              <div key={log.id} className="px-4 py-3.5 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Avatar name={log.actor?.full_name ?? 'System'} src={log.actor?.avatar_url ?? null} size={26} />
                    <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.actor?.full_name ?? 'System'}
                    </p>
                  </div>
                  <ActionBadge action={log.action} />
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginTop: '7px' }}>{sentence(log)}</p>
                {log.details?.diff && <DiffList diff={log.details.diff} />}
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                  {fmtWhen(log.created_at)} · {MODULE_LABEL[log.target_table] ?? log.target_table}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: flat table */}
          <div className="hidden md:block bg-white rounded-xl border border-black/6 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium" style={{ width: '160px' }}>When</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium" style={{ width: '190px' }}>Who</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Activity</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium" style={{ width: '130px' }}>Module</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium" style={{ width: '120px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition last:border-0" style={{ verticalAlign: 'top' }}>
                    <td className="px-6 py-4 text-gray-500" style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>
                      {fmtWhen(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <Avatar name={log.actor?.full_name ?? 'System'} src={log.actor?.avatar_url ?? null} size={26} />
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.actor?.full_name ?? 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>{sentence(log)}</p>
                      {log.details?.diff && <DiffList diff={log.details.diff} />}
                    </td>
                    <td className="px-6 py-4 text-gray-500" style={{ fontSize: '12px' }}>
                      {MODULE_LABEL[log.target_table] ?? log.target_table}
                    </td>
                    <td className="px-6 py-4">
                      <ActionBadge action={log.action} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager page={page} totalPages={totalPages} hrefFor={p => pageHref(filters, p)} />
        </>
      )}

      {/* Retention purge (privacy policy) — consultant-only page, so no extra gate needed */}
      <PurgeExpiredCard />
    </div>
  )
}
