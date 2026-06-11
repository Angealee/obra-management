import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile, ObraEventWithDetails } from '@/types/database'

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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')
  if (profile.system_role === 'member') redirect('/dashboard')

  // Fetch events with academic year and creator info
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      academic_years ( label ),
      profiles ( full_name )
    `)
    .order('event_date', { ascending: false }) as { data: ObraEventWithDetails[] | null }

  const grouped = {
    upcoming:  events?.filter(e => e.status === 'upcoming')  ?? [],
    ongoing:   events?.filter(e => e.status === 'ongoing')   ?? [],
    completed: events?.filter(e => e.status === 'completed') ?? [],
    cancelled: events?.filter(e => e.status === 'cancelled') ?? [],
  }

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            {events?.length ?? 0} total event{(events?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Link
            href="/dashboard/events/new"
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            + Add Event
          </Link>
        )}
      </div>

      {/* Empty state */}
      {!events || events.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No events yet.</p>
          {canManage && (
            <Link href="/dashboard/events/new" className="mt-4 inline-block text-sm text-gray-600 underline">
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">

          {/* Ongoing first — most urgent */}
          {grouped.ongoing.length > 0 && (
            <EventSection title="Ongoing" events={grouped.ongoing} />
          )}

          {/* Then upcoming */}
          {grouped.upcoming.length > 0 && (
            <EventSection title="Upcoming" events={grouped.upcoming} />
          )}

          {/* Then completed */}
          {grouped.completed.length > 0 && (
            <EventSection title="Completed" events={grouped.completed} />
          )}

          {/* Cancelled last */}
          {grouped.cancelled.length > 0 && (
            <EventSection title="Cancelled" events={grouped.cancelled} muted />
          )}

        </div>
      )}
    </div>
  )
}

function EventSection({
  title,
  events,
  muted = false,
}: {
  title: string
  events: ObraEventWithDetails[]
  muted?: boolean
}) {
  return (
    <div>
      <h2 className={`text-sm font-medium mb-3 ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </h2>
      {/* Mobile: stacked cards */}
      <div className={`md:hidden bg-white rounded-xl shadow-sm overflow-hidden ${muted ? 'opacity-60' : ''}`}>
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/events/${event.id}`}
            className="block px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-800 text-sm">{event.title}</p>
              <StatusBadge status={event.status} />
            </div>
            {event.description && (
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">{event.description}</p>
            )}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
              <span>
                {new Date(event.event_date).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
                {event.event_time && ` · ${event.event_time.slice(0, 5)}`}
              </span>
              {event.location && <span>· {event.location}</span>}
              {event.academic_years?.label && <span>· {event.academic_years.label}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: Table */}
      <div className={`hidden md:block bg-white rounded-xl shadow-sm overflow-hidden ${muted ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Event</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Date</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Location</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Academic Year</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50 transition last:border-0">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">{event.title}</p>
                  {event.description && (
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{event.description}</p>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(event.event_date).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                  {event.event_time && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {event.event_time.slice(0, 5)}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">{event.location ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500">
                  {event.academic_years?.label ?? '—'}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={event.status} />
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="text-gray-500 hover:text-gray-900 underline text-xs"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}