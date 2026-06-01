import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile, DutyWithDetails } from '@/types/database'

const statusStyles: Record<string, string> = {
  pending:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-yellow-100 text-yellow-700',
  reviewed:    'bg-green-100 text-green-700',
}

const statusLabels: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  reviewed:    'Reviewed',
}

const priorityStyles: Record<string, string> = {
  low:    'bg-gray-50 text-gray-400',
  normal: 'bg-gray-100 text-gray-500',
  high:   'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

export default async function DutiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // Heads see all duties; members see only their own
  const query = supabase
    .from('duties')
    .select(`
      *,
      events ( title, event_date ),
      assignee:profiles!duties_assigned_to_fkey ( full_name ),
      assigner:profiles!duties_assigned_by_fkey ( full_name ),
      duty_checklists ( id, is_done )
    `)
    .order('created_at', { ascending: false })

  if (!isHead) query.eq('assigned_to', user.id)

  const { data: duties } = await query as { data: DutyWithDetails[] | null }

  const pending     = duties?.filter(d => d.status === 'pending')     ?? []
  const in_progress = duties?.filter(d => d.status === 'in_progress') ?? []
  const completed   = duties?.filter(d => d.status === 'completed')   ?? []
  const reviewed    = duties?.filter(d => d.status === 'reviewed')    ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isHead ? 'All Duties' : 'My Duties'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pending.length} pending · {in_progress.length} in progress · {completed.length} completed · {reviewed.length} reviewed
          </p>
        </div>
        {isHead && (
          <Link
            href="/dashboard/duties/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            + Assign Duty
          </Link>
        )}
      </div>

      {!duties || duties.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">
            {isHead ? 'No duties assigned yet.' : 'You have no duties assigned yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <DutySection title="Pending" duties={pending} isHead={isHead}
              statusStyles={statusStyles} statusLabels={statusLabels} priorityStyles={priorityStyles} />
          )}
          {in_progress.length > 0 && (
            <DutySection title="In Progress" duties={in_progress} isHead={isHead}
              statusStyles={statusStyles} statusLabels={statusLabels} priorityStyles={priorityStyles} />
          )}
          {completed.length > 0 && (
            <DutySection title="Completed — Awaiting Review" duties={completed} isHead={isHead}
              statusStyles={statusStyles} statusLabels={statusLabels} priorityStyles={priorityStyles} />
          )}
          {reviewed.length > 0 && (
            <DutySection title="Reviewed" duties={reviewed} isHead={isHead} muted
              statusStyles={statusStyles} statusLabels={statusLabels} priorityStyles={priorityStyles} />
          )}
        </div>
      )}
    </div>
  )
}

function DutySection({
  title, duties, isHead, muted = false,
  statusStyles, statusLabels, priorityStyles,
}: {
  title: string
  duties: DutyWithDetails[]
  isHead: boolean
  muted?: boolean
  statusStyles: Record<string, string>
  statusLabels: Record<string, string>
  priorityStyles: Record<string, string>
}) {
  return (
    <div>
      <h2 className={`text-sm font-medium mb-3 ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </h2>
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${muted ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Duty</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Event</th>
              {isHead && <th className="text-left px-6 py-4 text-gray-500 font-medium">Assigned To</th>}
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Priority</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Progress</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {duties.map(duty => {
              const checklist = (duty.duty_checklists as any[]) ?? []
              const done = checklist.filter((c: any) => c.is_done).length
              const total = checklist.length

              return (
                <tr key={duty.id} className="border-b border-gray-50 hover:bg-gray-50 transition last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{duty.title}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">
                      {duty.duty_type.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <p>{duty.events?.title ?? '—'}</p>
                    {duty.events?.event_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(duty.events.event_date).toLocaleDateString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    )}
                  </td>
                  {isHead && (
                    <td className="px-6 py-4 text-gray-500">
                      {(duty as any).assignee?.full_name ?? '—'}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${priorityStyles[duty.priority]}`}>
                      {duty.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full transition-all"
                            style={{ width: `${(done / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{done}/{total}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyles[duty.status]}`}>
                      {statusLabels[duty.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/duties/${duty.id}`}
                      className="text-gray-500 hover:text-gray-900 underline text-xs"
                    >
                      View
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
}