import { ListChecks } from 'lucide-react'
import WorkloadBadge from '@/components/WorkLoadBadge'
import EmptyState from '@/components/EmptyState'
import Pager from '@/components/Pager'
import { createClient } from '@/lib/supabase/server'
import { dutyTypeLabel } from '@/lib/memberRole'
import { dutyDisplayStatus, dutyUrgency, type DutyDisplayStatus } from '@/lib/dutyStatus'
import { DutyStatusBadge } from '@/components/ui/StatusBadge'
import { daysFromToday, parseDateOnly, phTodayStr } from '@/lib/relativeDate'
import DutyRowActions from './DutyRowActions'

// The duties board — groups + mobile cards + desktop table + reviewed pager.
// Shared between the member "My Duties" page (/dashboard/duties) and the
// admin "All Duties" tab of the Duties & Events hub (/dashboard/events?tab=duties),
// so the two surfaces can never drift apart. Hosts fetch via
// fetchDutiesBoardData and control link targets through pagerHrefFor/dutyHrefFor.
//
// Column order (admins): Assigned To → Duty → Event → Status → Priority → actions.
// The assignee (who) is the first thing a head scans, so it leads and is bold.

// Valid-format UUID that matches no row — used so "no year selected" yields an
// empty result instead of an unscoped query.
const NONE_UUID = '00000000-0000-0000-0000-000000000000'

// Reviewed history paginates; active groups always show in full.
export const HISTORY_PAGE_SIZE = 10

const DUTY_COLUMNS = `
  id, title, duty_type, status, reviewed_by, priority, created_at, due_date,
  event_id, assigned_to,
  events!inner ( id, title, event_date ),
  assignee:profiles!duties_assigned_to_fkey ( full_name )
`

const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

function PriorityPill({ priority }: { priority: string }) {
  const [bg, color] = priorityStyle[priority] ?? priorityStyle.normal
  return (
    <span style={{ fontSize: '11.5px', fontWeight: 600, background: bg, color, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {priority}
    </span>
  )
}

function StatusCell({ display, mark }: { display: DutyDisplayStatus; mark: string | null }) {
  if (mark) return <WorkloadBadge mark={mark} />
  return <DutyStatusBadge display={display} />
}

// Left-edge triage rail: overdue reads red, then color by display status.
// Rendered as an inset box-shadow so it never shifts the cell's layout.
function railColor(duty: any, display: DutyDisplayStatus, today: Date): string {
  const days = duty.due_date ? daysFromToday(duty.due_date, today) : null
  if (display !== 'reviewed' && days !== null && days < 0) return '#CC0000' // overdue
  switch (display) {
    case 'in_progress':     return '#3b82f6'
    case 'awaiting_review': return '#ca8a04'
    case 'reviewed':        return '#16a34a'
    default:                return '#d1d5db' // pending
  }
}
const rail = (color: string) => `inset 4px 0 0 0 ${color}`

// Initials avatar for the assignee — makes the "who" scannable at a glance.
function Who({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '—'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: '#111', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11.5, fontWeight: 700,
      }}>
        {initials}
      </div>
      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </div>
  )
}

// Small pill spelling out due-date pressure ("Overdue by 2 days", "Due today").
function UrgencyChip({ duty, today }: { duty: any; today: Date }) {
  const days = duty.due_date ? daysFromToday(duty.due_date, today) : null
  const u = dutyUrgency(duty, days)
  if (!u) return null
  return (
    <span style={{
      fontSize: '10.5px', fontWeight: 600, color: u.color, background: u.bg,
      padding: '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap',
    }}>
      {u.label}
    </span>
  )
}

export type DutiesBoardData = {
  activeDuties: any[]
  reviewedDuties: any[]
  reviewedTotal: number
  totalPages: number
  markMap: Record<string, string>
  counts: { pending: number; in_progress: number; awaiting_review: number }
}

// Duties belong to a year through their event (events!inner join). ACTIVE
// duties (pending / in progress / awaiting review) are always shown in full —
// people work from them. The REVIEWED history grows unbounded, so it is
// fetched separately with a count and paginated. Marks are scoped by YEAR
// through the event join (not by fetched duty ids), making the query
// independent — all three run in parallel, no waterfall.
export async function fetchDutiesBoardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  { viewYearId, userId, isHead, page }: {
    viewYearId: string | null
    userId: string
    isHead: boolean
    page: number
  }
): Promise<DutiesBoardData> {
  // Active duties are a priority queue: nearest due date first, undated last.
  const activeQuery = supabase
    .from('duties')
    .select(DUTY_COLUMNS)
    .eq('events.academic_year_id', viewYearId ?? NONE_UUID)
    .or('status.in.(pending,in_progress),and(status.eq.completed,reviewed_by.is.null)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (!isHead) activeQuery.eq('assigned_to', userId)

  const reviewedQuery = supabase
    .from('duties')
    .select(DUTY_COLUMNS, { count: 'exact' })
    .eq('events.academic_year_id', viewYearId ?? NONE_UUID)
    .or('and(status.eq.completed,reviewed_by.not.is.null),status.eq.reviewed')
    .order('created_at', { ascending: false })
    .range((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE - 1)
  if (!isHead) reviewedQuery.eq('assigned_to', userId)

  const marksQuery = supabase
    .from('workload_marks')
    .select('member_id, event_id, mark, events!inner(academic_year_id)')
    .eq('events.academic_year_id', viewYearId ?? NONE_UUID)
    .limit(5000)
  if (!isHead) marksQuery.eq('member_id', userId)

  const [
    { data: activeDuties },
    { data: reviewedDuties, count: reviewedCount },
    { data: marks },
  ] = await Promise.all([activeQuery, reviewedQuery, marksQuery])

  const reviewedTotal = reviewedCount ?? 0
  const active = (activeDuties ?? []) as any[]

  const markMap: Record<string, string> = {}
  for (const m of marks ?? []) {
    markMap[`${m.member_id}_${m.event_id}`] = m.mark
  }

  return {
    activeDuties: active,
    reviewedDuties: (reviewedDuties ?? []) as any[],
    reviewedTotal,
    totalPages: Math.max(1, Math.ceil(reviewedTotal / HISTORY_PAGE_SIZE)),
    markMap,
    counts: {
      pending:         active.filter(d => dutyDisplayStatus(d) === 'pending').length,
      in_progress:     active.filter(d => dutyDisplayStatus(d) === 'in_progress').length,
      awaiting_review: active.filter(d => dutyDisplayStatus(d) === 'awaiting_review').length,
    },
  }
}

function EventCell({ duty }: { duty: any }) {
  return (
    <>
      <p style={{ color: '#333', fontSize: '13px', margin: 0 }}>{duty.events?.title ?? '—'}</p>
      {duty.events?.event_date && (
        <p style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '2px' }}>
          {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </>
  )
}

export default function DutiesBoard({
  data,
  isHead,
  userId,
  page,
  pagerHrefFor,
  dutyHrefFor = id => `/dashboard/duties/${id}`,
  empty,
}: {
  data: DutiesBoardData
  isHead: boolean
  userId: string
  page: number
  pagerHrefFor: (p: number) => string
  dutyHrefFor?: (id: string) => string
  empty: { title: string; description: string; action?: { label: string; href: string } }
}) {
  const { activeDuties, reviewedDuties, reviewedTotal, totalPages, markMap } = data

  const groups: Record<DutyDisplayStatus, any[]> = {
    pending:         activeDuties.filter((d: any) => dutyDisplayStatus(d) === 'pending'),
    in_progress:     activeDuties.filter((d: any) => dutyDisplayStatus(d) === 'in_progress'),
    awaiting_review: activeDuties.filter((d: any) => dutyDisplayStatus(d) === 'awaiting_review'),
    reviewed:        reviewedDuties,
  }

  const groupTitles: Record<DutyDisplayStatus, string> = {
    pending: 'Pending', in_progress: 'In Progress',
    awaiting_review: 'Awaiting Review', reviewed: 'Reviewed',
  }

  const today = parseDateOnly(phTodayStr())

  if (activeDuties.length === 0 && reviewedTotal === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    )
  }

  // Header columns follow the requested order; "Assigned To" only for admins.
  const headers = [
    isHead ? 'Assigned To' : null,
    'Duty', 'Event', 'Status', 'Priority', '',
  ].filter(Boolean) as string[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(Object.entries(groups) as [DutyDisplayStatus, any[]][]).map(([groupStatus, groupDuties]) => {
        // The reviewed section exists whenever ANY reviewed duties exist —
        // even if the current page slice is empty (e.g. a stale deep link).
        const sectionTotal = groupStatus === 'reviewed' ? reviewedTotal : groupDuties.length
        if (sectionTotal === 0) return null
        return (
          <div key={groupStatus}>
            <p style={{
              // Park below the sticky year bar (var set in the dashboard layout;
              // 0 for members, who have no bar).
              position: 'sticky', top: 'var(--obra-topbar-h, 0px)', zIndex: 5,
              background: '#F7F7F5', padding: '6px 2px', margin: '0 0 8px',
              fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: '#6b7280',
            }}>
              {groupTitles[groupStatus]}{' '}
              <span style={{ color: '#ccc' }}>({sectionTotal})</span>
            </p>

            {/* Mobile: stacked cards — assignee name leads for admins */}
            <div className="md:hidden" style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '10px',
              overflow: 'hidden',
              opacity: groupStatus === 'reviewed' ? 0.75 : 1,
            }}>
              {groupDuties.map((duty: any, i: number) => {
                const mark = markMap[`${duty.assigned_to}_${duty.event_id}`] ?? null
                const display = dutyDisplayStatus(duty)
                return (
                  <div key={duty.id} style={{ padding: '14px 16px 14px 18px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', boxShadow: rail(railColor(duty, display, today)) }}>
                    {/* WHO — prioritized for admins */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      {isHead
                        ? <Who name={duty.assignee?.full_name ?? '—'} />
                        : <p style={{ fontSize: '14px', fontWeight: 600, color: '#111', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{duty.title}</p>}
                      <StatusCell display={dutyDisplayStatus(duty)} mark={mark} />
                    </div>

                    {/* Duty (secondary for admins, since the name already led) */}
                    {isHead && (
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111', margin: '9px 0 0', lineHeight: 1.35 }}>{duty.title}</p>
                    )}
                    <p style={{ fontSize: '11.5px', color: '#6b7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {dutyTypeLabel(duty.duty_type)}
                      <UrgencyChip duty={duty} today={today} />
                    </p>

                    <p style={{ color: '#6b7280', fontSize: '12.5px', marginTop: '7px' }}>
                      {duty.events?.title ?? '—'}
                      {duty.events?.event_date && (
                        <span style={{ color: '#9ca3af' }}>
                          {' · '}
                          {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: 8 }}>
                      <PriorityPill priority={duty.priority} />
                      <DutyRowActions
                        dutyId={duty.id}
                        canManage={isHead}
                        isAssignee={duty.assigned_to === userId}
                        status={duty.status}
                        isReviewed={dutyDisplayStatus(duty) === 'reviewed'}
                        viewHref={dutyHrefFor(duty.id)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Table — Assigned To · Duty · Event · Status · Priority · actions */}
            <div className="hidden md:block" style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '10px',
              overflow: 'hidden',
              opacity: groupStatus === 'reviewed' ? 0.75 : 1,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {headers.map((col, i) => (
                      <th key={i} style={{ textAlign: i === headers.length - 1 ? 'right' : 'left', padding: '11px 20px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupDuties.map((duty: any, i: number) => {
                    const mark = markMap[`${duty.assigned_to}_${duty.event_id}`] ?? null
                    const display = dutyDisplayStatus(duty)
                    const railBox = rail(railColor(duty, display, today))
                    return (
                      <tr
                        key={duty.id}
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        {/* Assigned To — heads only, leads the row (carries the status rail) */}
                        {isHead && (
                          <td style={{ padding: '14px 20px', maxWidth: 220, boxShadow: railBox }}>
                            <Who name={duty.assignee?.full_name ?? '—'} />
                          </td>
                        )}

                        {/* Duty */}
                        <td style={{ padding: '14px 20px', maxWidth: '240px', boxShadow: isHead ? undefined : railBox }}>
                          <p style={{ fontWeight: 500, color: '#111', lineHeight: 1.3, margin: 0 }}>{duty.title}</p>
                          <p style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {dutyTypeLabel(duty.duty_type)}
                            <UrgencyChip duty={duty} today={today} />
                          </p>
                        </td>

                        {/* Event */}
                        <td style={{ padding: '14px 20px' }}>
                          <EventCell duty={duty} />
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 20px' }}>
                          <StatusCell display={dutyDisplayStatus(duty)} mark={mark} />
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '14px 20px' }}>
                          <PriorityPill priority={duty.priority} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                          <DutyRowActions
                            dutyId={duty.id}
                            canManage={isHead}
                            isAssignee={duty.assigned_to === userId}
                            status={duty.status}
                            isReviewed={dutyDisplayStatus(duty) === 'reviewed'}
                            viewHref={dutyHrefFor(duty.id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {groupStatus === 'reviewed' && (
              <Pager page={page} totalPages={totalPages} hrefFor={pagerHrefFor} />
            )}
          </div>
        )
      })}
    </div>
  )
}
