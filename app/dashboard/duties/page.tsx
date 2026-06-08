import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import WorkloadBadge from '@/components/WorkLoadBadge'

const statusStyle: Record<string, [string, string]> = {
  pending:     ['#f3f4f6', '#6b7280'],
  in_progress: ['#eff6ff', '#3b82f6'],
  completed:   ['#fefce8', '#ca8a04'],
  reviewed:    ['#f0fdf4', '#16a34a'],
}
const statusLabel: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', reviewed: 'Reviewed',
}
const priorityStyle: Record<string, [string, string]> = {
  low:    ['#f9fafb', '#9ca3af'],
  normal: ['#f3f4f6', '#6b7280'],
  high:   ['#fff7ed', '#ea580c'],
  urgent: ['#fff1f2', '#CC0000'],
}

export default async function DutiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // Fetch duties
  const dutiesQuery = supabase
    .from('duties')
    .select(`
      id, title, duty_type, status, priority, created_at,
      event_id, assigned_to,
      events ( id, title, event_date ),
      assignee:profiles!duties_assigned_to_fkey ( full_name ),
      duty_checklists ( id, is_done )
    `)
    .order('created_at', { ascending: false })

  if (!isHead) dutiesQuery.eq('assigned_to', user.id)

  const { data: duties } = await dutiesQuery

  // Fetch workload marks for these duties
  const eventIds   = [...new Set((duties ?? []).map((d: any) => d.event_id).filter(Boolean))]
  const memberIds  = [...new Set((duties ?? []).map((d: any) => d.assigned_to).filter(Boolean))]

  const { data: marks } = eventIds.length > 0 && memberIds.length > 0
    ? await supabase
        .from('workload_marks')
        .select('member_id, event_id, mark')
        .in('event_id', eventIds)
        .in('member_id', memberIds)
    : { data: [] }

  // Build mark lookup: `memberId_eventId` -> mark
  const markMap: Record<string, string> = {}
  for (const m of marks ?? []) {
    markMap[`${m.member_id}_${m.event_id}`] = m.mark
  }

  // Group by status
  const groups = {
    pending:     (duties ?? []).filter((d: any) => d.status === 'pending'),
    in_progress: (duties ?? []).filter((d: any) => d.status === 'in_progress'),
    completed:   (duties ?? []).filter((d: any) => d.status === 'completed'),
    reviewed:    (duties ?? []).filter((d: any) => d.status === 'reviewed'),
  }

  return (
    <div>
      {/* Header */}
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
          <Link href="/dashboard/duties/new" className="btn-primary">+ Assign Duty</Link>
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
            const titles: Record<string, string> = {
              pending: 'Pending', in_progress: 'In Progress',
              completed: 'Completed — Awaiting Review', reviewed: 'Reviewed',
            }
            return (
              <div key={groupStatus}>
                <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '10px' }}>
                  {titles[groupStatus]} <span style={{ color: '#ccc' }}>({groupDuties.length})</span>
                </p>
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden', opacity: groupStatus === 'reviewed' ? 0.75 : 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Duty</th>
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Event</th>
                        {isHead && <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Assigned To</th>}
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Priority</th>
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Progress</th>
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '11px 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#bbb' }}>Mark</th>
                        <th style={{ padding: '11px 20px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupDuties.map((duty: any, i: number) => {
                        const checklist = duty.duty_checklists ?? []
                        const done  = checklist.filter((c: any) => c.is_done).length
                        const total = checklist.length
                        const mark  = markMap[`${duty.assigned_to}_${duty.event_id}`] ?? null
                        const [sbg, stc] = statusStyle[duty.status] ?? ['#f3f4f6', '#6b7280']
                        const [pbg, ptc] = priorityStyle[duty.priority] ?? ['#f3f4f6', '#6b7280']

                        return (
                          <tr key={duty.id} style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'background 0.1s ease' }}
                            className="hover:bg-gray-50/60">
                            <td style={{ padding: '13px 20px' }}>
                              <p style={{ fontWeight: 500, color: '#111' }}>{duty.title}</p>
                              <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px', textTransform: 'capitalize' }}>
                                {duty.duty_type.replace('_', ' ')}
                              </p>
                            </td>
                            <td style={{ padding: '13px 20px' }}>
                              <p style={{ color: '#555' }}>{duty.events?.title ?? '—'}</p>
                              {duty.events?.event_date && (
                                <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px' }}>
                                  {new Date(duty.events.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              )}
                            </td>
                            {isHead && (
                              <td style={{ padding: '13px 20px', color: '#555' }}>
                                {duty.assignee?.full_name ?? '—'}
                              </td>
                            )}
                            <td style={{ padding: '13px 20px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, background: pbg, color: ptc, padding: '3px 9px', borderRadius: '99px', textTransform: 'capitalize' }}>
                                {duty.priority}
                              </span>
                            </td>
                            <td style={{ padding: '13px 20px' }}>
                              {total > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '56px', height: '4px', background: '#f0f0ee', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: '#111', width: `${(done / total) * 100}%`, borderRadius: '99px' }} />
                                  </div>
                                  <span style={{ fontSize: '11.5px', color: '#bbb' }}>{done}/{total}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#ddd' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '13px 20px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, background: sbg, color: stc, padding: '3px 10px', borderRadius: '99px' }}>
                                {statusLabel[duty.status]}
                              </span>
                            </td>
                            <td style={{ padding: '13px 20px' }}>
                              <WorkloadBadge mark={mark} />
                            </td>
                            <td style={{ padding: '13px 20px' }}>
                              <Link href={`/dashboard/duties/${duty.id}`}
                                style={{ fontSize: '12px', color: '#bbb', textDecoration: 'none' }}
                                className="hover:text-gray-700 transition-colors">
                                View →
                              </Link>
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