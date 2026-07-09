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

function StatusCell({ display, mark }: { display: DutyDisplayStatus; mark: string | null }) {
  if (mark) return <WorkloadBadge mark={mark} />
  return <DutyStatusBadge display={display} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(Object.entries(groups) as [DutyDisplayStatus, any[]][]).map(([groupStatus, groupDuties]) => {
        // The reviewed section exists whenever ANY reviewed duties exist —
        // even if the current page slice is empty (e.g. a stale deep link).
        const sectionTotal = groupStatus === 'reviewed' ? reviewedTotal : groupDuties.length
        if (sectionTotal === 0) return null
        return (
          <div key={groupStatus}>
            <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '10px' }}>
              {groupTitles[groupStatus]}{' '}
              <span style={{ color: '#ccc' }}>({sectionTotal})</span>
            </p>

            {/* Mobile: stacked cards */}
            <div className="md:hidden" style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: '10px',
              overflow: 'hidden',
              opacity: groupStatus === 'reviewed' ? 0.75 : 1,
            }}>
              {groupDuties.map((duty: any, i: number) => {
                const mark = markMap[`${duty.assigned_to}_${duty.event_id}`] ?? null
                const [pbg, ptc] = priorityStyle[duty.priority] ?? ['#f3f4f6', '#6b7280']

                return (
                  <div key={duty.id} style={{ padding: '13px 16px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: '#111', lineHeight: 1.3, fontSize: '13.5px' }}>{duty.title}</p>
                        <p style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {dutyTypeLabel(duty.duty_type)}
                          <UrgencyChip duty={duty} today={today} />
                        </p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 9px', borderRadius: '99px', textTransform: 'capitalize', flexShrink: 0 }}>
                        {duty.priority}
                      </span>
                    </div>

                    <p style={{ color: '#6b7280', fontSize: '12.5px', marginTop: '8px' }}>
                      {duty.events?.title ?? '—'}
                      {duty.events?.event_date && (
                        <span style={{ color: '#bbb' }}>
                          {' · '}
                          {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </p>

                    {isHead && (
                      <p style={{ color: '#6b7280', fontSize: '12.5px', marginTop: '2px' }}>
                        Assigned to <span style={{ color: '#555', fontWeight: 500 }}>{duty.assignee?.full_name ?? '—'}</span>
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <StatusCell display={dutyDisplayStatus(duty)} mark={mark} />
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

            {/* Desktop: Table */}
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
                    {[
                      'Duty',
                      'Event',
                      isHead ? 'Assigned To' : null,
                      'Priority',
                      'Status',
                      '',
                    ].filter(Boolean).map((col, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupDuties.map((duty: any, i: number) => {
                    const mark = markMap[`${duty.assigned_to}_${duty.event_id}`] ?? null
                    const [pbg, ptc] = priorityStyle[duty.priority] ?? ['#f3f4f6', '#6b7280']

                    return (
                      <tr
                        key={duty.id}
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        {/* Duty */}
                        <td style={{ padding: '13px 20px', maxWidth: '260px' }}>
                          <p style={{ fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{duty.title}</p>
                          <p style={{ fontSize: '11.5px', color: '#6b7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {dutyTypeLabel(duty.duty_type)}
                            <UrgencyChip duty={duty} today={today} />
                          </p>
                        </td>

                        {/* Event */}
                        <td style={{ padding: '13px 20px' }}>
                          <p style={{ color: '#555', fontSize: '13px' }}>{duty.events?.title ?? '—'}</p>
                          {duty.events?.event_date && (
                            <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px' }}>
                              {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </td>

                        {/* Assigned To — heads only */}
                        {isHead && (
                          <td style={{ padding: '13px 20px', color: '#555', fontSize: '13px' }}>
                            {duty.assignee?.full_name ?? '—'}
                          </td>
                        )}

                        {/* Priority */}
                        <td style={{ padding: '13px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 9px', borderRadius: '99px', textTransform: 'capitalize' }}>
                            {duty.priority}
                          </span>
                        </td>

                        {/* Status — shows workload mark if set, otherwise duty status */}
                        <td style={{ padding: '13px 20px' }}>
                          <StatusCell display={dutyDisplayStatus(duty)} mark={mark} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
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
