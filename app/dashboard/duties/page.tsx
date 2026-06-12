import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import WorkloadBadge from '@/components/WorkLoadBadge'
import DutyRowActions from './DutyRowActions'
import { getAcademicYearContext } from '@/lib/academicYear'

const statusStyle: Record<string, [string, string]> = {
  pending:     ['#f3f4f6', '#6b7280'],
  in_progress: ['#eff6ff', '#3b82f6'],
  completed:   ['#fefce8', '#ca8a04'],
  reviewed:    ['#f0fdf4', '#16a34a'],
}
const statusLabel: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', reviewed: 'Reviewed',
}
const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

function StatusCell({ dutyStatus, mark }: { dutyStatus: string; mark: string | null }) {
  if (mark) return <WorkloadBadge mark={mark} />
  const [bg, tc] = statusStyle[dutyStatus] ?? ['#f3f4f6', '#6b7280']
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, background: bg, color: tc, padding: '3px 10px', borderRadius: '99px' }}>
      {statusLabel[dutyStatus] ?? dutyStatus}
    </span>
  )
}

export default async function DutiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  const { viewYearId } = await getAcademicYearContext()

  // Duties belong to a year through their event. Resolve the chosen year's
  // event ids first, then scope duties to them.
  const { data: yearEvents } = viewYearId
    ? await supabase.from('events').select('id').eq('academic_year_id', viewYearId)
    : { data: [] as { id: string }[] }
  const yearEventIds = (yearEvents ?? []).map(e => e.id)

  const dutiesQuery = supabase
    .from('duties')
    .select(`
      id, title, duty_type, status, priority, created_at,
      event_id, assigned_to,
      events ( id, title, event_date ),
      assignee:profiles!duties_assigned_to_fkey ( full_name )
    `)
    .order('created_at', { ascending: false })

  if (!isHead) dutiesQuery.eq('assigned_to', user.id)
  if (yearEventIds.length > 0) dutiesQuery.in('event_id', yearEventIds)

  // No events for this year → no duties to show.
  const { data: duties } = yearEventIds.length > 0 ? await dutiesQuery : { data: [] }

  // Fetch workload marks
  const eventIds  = [...new Set((duties ?? []).map((d: any) => d.event_id).filter(Boolean))]
  const memberIds = [...new Set((duties ?? []).map((d: any) => d.assigned_to).filter(Boolean))]

  const { data: marks } = eventIds.length > 0 && memberIds.length > 0
    ? await supabase
        .from('workload_marks')
        .select('member_id, event_id, mark')
        .in('event_id', eventIds)
        .in('member_id', memberIds)
    : { data: [] }

  const markMap: Record<string, string> = {}
  for (const m of marks ?? []) {
    markMap[`${m.member_id}_${m.event_id}`] = m.mark
  }

  const groups: Record<string, any[]> = {
    pending:     (duties ?? []).filter((d: any) => d.status === 'pending'),
    in_progress: (duties ?? []).filter((d: any) => d.status === 'in_progress'),
    completed:   (duties ?? []).filter((d: any) => d.status === 'completed'),
    reviewed:    (duties ?? []).filter((d: any) => d.status === 'reviewed'),
  }

  const groupTitles: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress',
    completed: 'Completed — Awaiting Review', reviewed: 'Reviewed',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
            {isHead ? 'All Duties' : 'My Duties'}
          </h1>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
            {groups.pending.length} pending · {groups.in_progress.length} in progress · {groups.completed.length} awaiting review · {groups.reviewed.length} reviewed
          </p>
        </div>
        {isHead && (
          <Link href="/dashboard/duties/new" className="btn-primary">
            + Assign Duty
          </Link>
        )}
      </div>

      {!duties || duties.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#bbb' }}>
            {isHead ? 'No duties assigned yet.' : 'You have no duties assigned yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groups).map(([groupStatus, groupDuties]) => {
            if (groupDuties.length === 0) return null
            return (
              <div key={groupStatus}>
                <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '10px' }}>
                  {groupTitles[groupStatus]}{' '}
                  <span style={{ color: '#ccc' }}>({groupDuties.length})</span>
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
                            <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px', textTransform: 'capitalize' }}>
                              {duty.duty_type.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 9px', borderRadius: '99px', textTransform: 'capitalize', flexShrink: 0 }}>
                            {duty.priority}
                          </span>
                        </div>

                        <p style={{ color: '#888', fontSize: '12.5px', marginTop: '8px' }}>
                          {duty.events?.title ?? '—'}
                          {duty.events?.event_date && (
                            <span style={{ color: '#bbb' }}>
                              {' · '}
                              {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </p>

                        {isHead && (
                          <p style={{ color: '#888', fontSize: '12.5px', marginTop: '2px' }}>
                            Assigned to <span style={{ color: '#555', fontWeight: 500 }}>{duty.assignee?.full_name ?? '—'}</span>
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                          <StatusCell dutyStatus={duty.status} mark={mark} />
                          <DutyRowActions dutyId={duty.id} canManage={isHead} />
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
                            <td style={{ padding: '13px 20px', maxWidth: '240px' }}>
                              <p style={{ fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{duty.title}</p>
                              <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px', textTransform: 'capitalize' }}>
                                {duty.duty_type.replace(/_/g, ' ')}
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
                              <StatusCell dutyStatus={duty.status} mark={mark} />
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '13px 20px', whiteSpace: 'nowrap' }}>
                              <DutyRowActions dutyId={duty.id} canManage={isHead} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}