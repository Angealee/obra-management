import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import EventStatusManager from './EventStatusManager'
import DeleteEventButton from './DeleteEventButton'
import { dutyTypeLabel } from '@/lib/memberRole'
import { dutyDisplayStatus, DUTY_DISPLAY_LABELS, DUTY_DISPLAY_STYLE } from '@/lib/dutyStatus'

export default async function EventDetailPage({
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

  // Fetch event with related data
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      academic_years ( label ),
      profiles ( full_name )
    `)
    .eq('id', id)
    .single()

  if (!event) redirect('/dashboard/events')
  
    const { data: duties } = await supabase
    .from('duties')
    .select(`
      id, title, duty_type, priority, status, reviewed_by,
      assignee:profiles!duties_assigned_to_fkey ( full_name )
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // Duty-outcome summary, derived from the merged display status.
  const dutyList = (duties ?? []) as any[]
  const outcomeCounts = {
    pending:         dutyList.filter(d => dutyDisplayStatus(d) === 'pending').length,
    in_progress:     dutyList.filter(d => dutyDisplayStatus(d) === 'in_progress').length,
    awaiting_review: dutyList.filter(d => dutyDisplayStatus(d) === 'awaiting_review').length,
    reviewed:        dutyList.filter(d => dutyDisplayStatus(d) === 'reviewed').length,
  }

  const statusStyles: Record<string, string> = {
    upcoming:  'bg-blue-100 text-blue-700',
    ongoing:   'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    upcoming:  'Upcoming',
    ongoing:   'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/events" className="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
          ← Back to Events
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
          <div className="flex items-center gap-3 shrink-0">
            {canManage && (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="text-xs text-gray-500 hover:text-gray-800 underline transition"
              >
                Edit Event
              </Link>
            )}
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyles[event.status]}`}>
              {statusLabels[event.status]}
            </span>
          </div>
        </div>
        {event.description && (
          <p className="text-gray-500 text-sm mt-2">{event.description}</p>
        )}
      </div>

      {/* Event Info */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Details</h2>
        {[
          ['Date', new Date(event.event_date).toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
          ['Time', event.event_time ? event.event_time.slice(0, 5) : '—'],
          ['Location', event.location ?? '—'],
          ['Academic Year', event.academic_years?.label ?? '—'],
          ['Created By', event.profiles?.full_name ?? '—'],
          ['Created', new Date(event.created_at).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Duties */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duties</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {dutyList.length > 0
                ? `${dutyList.length} assigned · ${outcomeCounts.pending} pending · ${outcomeCounts.in_progress} in progress · ${outcomeCounts.awaiting_review} awaiting review · ${outcomeCounts.reviewed} reviewed`
                : 'No duties assigned yet'}
            </p>
          </div>
          {canManage && (
            <Link
              href={`/dashboard/duties/new?event=${event.id}`}
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
            >
              + Assign Duty
            </Link>
          )}
        </div>

        {!duties || duties.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No duties assigned yet. Duties will appear here once assigned.
          </p>
        ) : (
          <div className="space-y-2">
            {dutyList.map(duty => {
              const display = dutyDisplayStatus(duty)
              const [sbg, stc] = DUTY_DISPLAY_STYLE[display]
              const dot = {
                reviewed: 'bg-green-500', awaiting_review: 'bg-yellow-500',
                in_progress: 'bg-blue-500', pending: 'bg-gray-300',
              }[display]
              return (
                <Link
                  key={duty.id}
                  href={`/dashboard/duties/${duty.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{duty.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dutyTypeLabel(duty.duty_type)} · {duty.assignee?.full_name ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pl-5 sm:pl-0">
                    {/* Priority badge */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      duty.priority === 'urgent' ? 'bg-red-100 text-red-600'    :
                      duty.priority === 'high'   ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {duty.priority}
                    </span>

                    {/* Status badge */}
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                      style={{ background: sbg, color: stc }}
                    >
                      {DUTY_DISPLAY_LABELS[display]}
                    </span>

                    <span className="text-gray-300 group-hover:text-gray-500 transition text-xs">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Status Manager */}
      {canManage && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Update Status</h2>
          <p className="text-gray-400 text-xs mb-4">
            Move this event through its lifecycle.
          </p>
          <EventStatusManager
            eventId={event.id}
            currentStatus={event.status}
          />
        </div>
      )}

      {/* Delete — consultant only */}
      {profile.system_role === 'consultant' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Danger Zone</h2>
          <p className="text-gray-400 text-xs mb-4">
            Permanently delete this event and all its duties.
          </p>
          <DeleteEventButton eventId={event.id} eventTitle={event.title} />
        </div>
      )}
    </div>
  )
}