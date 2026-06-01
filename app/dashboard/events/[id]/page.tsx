import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import EventStatusManager from './EventStatusManager'
import DeleteEventButton from './DeleteEventButton'

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

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

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
          <span className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${statusStyles[event.status]}`}>
            {statusLabels[event.status]}
          </span>
        </div>
        {event.description && (
          <p className="text-gray-500 text-sm mt-2">{event.description}</p>
        )}
      </div>

      {/* Event Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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

      {/* Duties section placeholder */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duties</h2>
          {canManage && (
            <Link
              href={`/dashboard/duties/new?event=${event.id}`}
              className="text-xs text-gray-500 hover:text-gray-800 underline transition"
            >
              + Assign Duty
            </Link>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          No duties assigned yet. Duties will appear here once assigned.
        </p>
      </div>

      {/* Status Manager */}
      {canManage && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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