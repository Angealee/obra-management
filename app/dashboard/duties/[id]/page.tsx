import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import DutyActions from './DutyActions'
import DutyDetailsForm from './DutyDetailsForm'
import { dutyDisplayStatus, DUTY_DISPLAY_LABELS, DUTY_DISPLAY_STYLE } from '@/lib/dutyStatus'

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-50 text-gray-400', normal: 'bg-gray-100 text-gray-500',
  high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600',
}

export default async function DutyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

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

  if (!duty) redirect('/dashboard/duties')

  // Fetch workload mark for this duty (the recorded outcome)
  const { data: workloadMark } = duty.assigned_to && duty.event_id
    ? await supabase
        .from('workload_marks')
        .select('mark')
        .eq('member_id', duty.assigned_to)
        .eq('event_id', duty.event_id)
        .maybeSingle()
    : { data: null }

  // Members can only view their own duties
  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  if (!isHead && duty.assigned_to !== user.id) redirect('/dashboard/duties')

  const isAssignee = duty.assigned_to === user.id
  const display = dutyDisplayStatus(duty)
  const [sbg, stc] = DUTY_DISPLAY_STYLE[display]

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/duties" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Duties
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-800">{duty.title}</h1>
          <div className="flex gap-2">
            <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${priorityStyles[duty.priority]}`}>
              {duty.priority}
            </span>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: sbg, color: stc }}
            >
              {DUTY_DISPLAY_LABELS[display]}
            </span>
          </div>
        </div>
      </div>

      {/* Context (read-only) */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Details</h2>
        {[
          ['Event', duty.events ? `${duty.events.title}` : '—'],
          ['Event Date', duty.events?.event_date
            ? new Date(duty.events.event_date).toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
            : '—'],
          ['Assigned To', (duty as any).assignee?.full_name ?? '—'],
          ['Assigned By', (duty as any).assigner?.full_name ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value}</span>
          </div>
        ))}

        {isHead && duty.assigned_to && duty.event_id && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`/dashboard/workloads?member=${duty.assigned_to}&event=${duty.event_id}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 underline transition"
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
        isAssignee={isAssignee}
        isHead={isHead}
        workloadMark={(workloadMark as any)?.mark ?? null}
      />
    </div>
  )
}
