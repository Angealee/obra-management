import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import DutyActions from './DutyActions'
import ChecklistPanel from './CheckListPanel'

const statusStyles: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-yellow-100 text-yellow-700',
  reviewed:    'bg-green-100 text-green-700',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', reviewed: 'Reviewed',
}

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
      reviewer:profiles!duties_reviewed_by_fkey ( id, full_name ),
      duty_checklists ( * )
    `)
    .eq('id', id)
    .single()

  if (!duty) redirect('/dashboard/duties')

  // Members can only view their own duties
  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  if (!isHead && duty.assigned_to !== user.id) redirect('/dashboard/duties')

  const isAssignee = duty.assigned_to === user.id
  const checklist = duty.duty_checklists ?? []

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
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyles[duty.status]}`}>
              {statusLabels[duty.status]}
            </span>
          </div>
        </div>
        {duty.description && (
          <p className="text-gray-500 text-sm mt-2">{duty.description}</p>
        )}
      </div>

      {/* Duty Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Details</h2>
        {[
          ['Event', duty.events ? `${duty.events.title}` : '—'],
          ['Event Date', duty.events?.event_date
            ? new Date(duty.events.event_date).toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
            : '—'],
          ['Assigned To', (duty as any).assignee?.full_name ?? '—'],
          ['Assigned By', (duty as any).assigner?.full_name ?? '—'],
          ['Duty Type', duty.duty_type.replace('_', ' ')],
          ['Due Date', duty.due_date ? new Date(duty.due_date).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) : '—'],
          ['Completed', duty.completed_at ? new Date(duty.completed_at).toLocaleDateString('en-PH') : '—'],
          ['Reviewed By', (duty as any).reviewer?.full_name ?? '—'],
          ['Reviewed', duty.reviewed_at ? new Date(duty.reviewed_at).toLocaleDateString('en-PH') : '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 font-medium capitalize">{value}</span>
          </div>
        ))}

        {duty.remarks && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Remarks from reviewer</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{duty.remarks}</p>
          </div>
        )}
      </div>

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Checklist</h2>
          <ChecklistPanel
            items={checklist}
            dutyStatus={duty.status}
            canCheck={isAssignee && (duty.status === 'pending' || duty.status === 'in_progress')}
          />
        </div>
      )}

      {/* Actions */}
      <DutyActions
        duty={duty}
        profile={profile}
        isAssignee={isAssignee}
        isHead={isHead}
      />
    </div>
  )
}