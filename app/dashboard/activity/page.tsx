import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import type { ActivityLog } from '@/types/database'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
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
      <PageHeader
        title="Activity"
        subtitle={
          total === 0
            ? 'Every change made in the system is recorded here.'
            : `${total} entr${total !== 1 ? 'ies' : 'y'} · who did what, and when.`
        }
      />

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
              : 'Activity appears here as records change.'
          }
        />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div
            className="md:hidden"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}
          >
            {rows.map((log, i) => (
              <div key={log.id} style={{ padding: '13px 16px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
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
          <div
            className="hidden md:block"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, overflow: 'hidden' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {([['When', 160], ['Who', 190], ['Activity', undefined], ['Module', 130], ['Action', 120]] as [string, number | undefined][]).map(([col, w]) => (
                    <th key={col} style={{ width: w, textAlign: 'left', padding: '11px 20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log, i) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/60 transition-colors"
                    style={{ verticalAlign: 'top', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                  >
                    <td style={{ padding: '13px 20px', whiteSpace: 'nowrap', fontSize: '12.5px', color: '#6b7280' }}>
                      {fmtWhen(log.created_at)}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <Avatar name={log.actor?.full_name ?? 'System'} src={log.actor?.avatar_url ?? null} size={26} />
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.actor?.full_name ?? 'System'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <p style={{ fontSize: '13px', color: '#444', margin: 0 }}>{sentence(log)}</p>
                      {log.details?.diff && <DiffList diff={log.details.diff} />}
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: '12px', color: '#6b7280' }}>
                      {MODULE_LABEL[log.target_table] ?? log.target_table}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
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
