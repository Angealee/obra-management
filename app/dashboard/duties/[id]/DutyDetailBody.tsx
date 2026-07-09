import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DutyActions from './DutyActions'
import DutyDetailsForm from './DutyDetailsForm'

// The duty detail content, minus the page header — shared between the
// standalone page (/dashboard/duties/[id], the push deep-link target) and the
// hub's ?duty= slide-over, so the two renderings can never drift apart.

export async function fetchDutyDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<{ duty: any; workloadMark: string | null } | null> {
  const { data: duty } = await supabase
    .from('duties')
    .select(`
      *,
      events ( id, title, event_date ),
      assignee:profiles!duties_assigned_to_fkey ( id, full_name ),
      assigner:profiles!duties_assigned_by_fkey ( id, full_name ),
      reviewer:profiles!duties_reviewed_by_fkey ( id, full_name )
    `)
    .eq('id', id)
    .single()

  if (!duty) return null

  // The recorded outcome (workload mark) for this member × event.
  const { data: workloadMark } = duty.assigned_to && duty.event_id
    ? await supabase
        .from('workload_marks')
        .select('mark')
        .eq('member_id', duty.assigned_to)
        .eq('event_id', duty.event_id)
        .maybeSingle()
    : { data: null }

  return { duty, workloadMark: (workloadMark as any)?.mark ?? null }
}

export default function DutyDetailBody({
  duty,
  workloadMark,
  profile,
  isHead,
}: {
  duty: any
  workloadMark: string | null
  profile: any
  isHead: boolean
}) {
  const detailRows: [string, string][] = [
    ['Event', duty.events ? `${duty.events.title}` : '—'],
    ['Event Date', duty.events?.event_date
      ? new Date(duty.events.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '—'],
    ['Assigned To', duty.assignee?.full_name ?? '—'],
    ['Assigned By', duty.assigner?.full_name ?? '—'],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Context (read-only) */}
      <div className="dash-card">
        <p className="section-label" style={{ marginBottom: 12 }}>Details</p>
        {detailRows.map(([label, value], i) => (
          <div
            key={label}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0',
              borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
            <span style={{ fontSize: '13.5px', color: '#111', fontWeight: 500, textAlign: 'right' }}>{value}</span>
          </div>
        ))}

        {isHead && duty.assigned_to && duty.event_id && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Link
              href={`/dashboard/workloads?member=${duty.assigned_to}&event=${duty.event_id}`}
              style={{ fontSize: '13px', color: '#555', textDecoration: 'underline' }}
              className="hover:text-gray-900 transition"
            >
              View in Workload Matrix →
            </Link>
          </div>
        )}
      </div>

      {/* Editable description / priority / due date */}
      <DutyDetailsForm
        duty={{ id: duty.id, description: duty.description, priority: duty.priority, due_date: duty.due_date }}
        isHead={isHead}
      />

      {/* Actions */}
      <DutyActions
        duty={duty}
        profile={profile}
        isAssignee={duty.assigned_to === profile.id}
        isHead={isHead}
        workloadMark={workloadMark}
      />
    </div>
  )
}
