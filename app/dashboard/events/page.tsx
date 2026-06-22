import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ObraEventWithDetails } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import { CalendarDays } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'

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
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()

  const { viewYear, viewYearId } = await getAcademicYearContext()

  // Fetch events for the chosen academic year only
  const { data: events } = viewYearId
    ? await supabase
        .from('events')
        .select(`
          *,
          academic_years ( label ),
          profiles ( full_name )
        `)
        .eq('academic_year_id', viewYearId)
        .order('event_date', { ascending: false }) as { data: ObraEventWithDetails[] | null }
    : { data: [] as ObraEventWithDetails[] }

  const grouped = {
    upcoming:  events?.filter(e => e.status === 'upcoming')  ?? [],
    ongoing:   events?.filter(e => e.status === 'ongoing')   ?? [],
    completed: events?.filter(e => e.status === 'completed') ?? [],
    cancelled: events?.filter(e => e.status === 'cancelled') ?? [],
  }

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  const eventCount = events?.length ?? 0

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">
            {eventCount === 0
              ? (viewYear ? `No events for ${viewYear.label} yet.` : 'Shoots, deadlines, and org activities — grouped by status.')
              : `${eventCount} event${eventCount !== 1 ? 's' : ''}${viewYear ? ` for ${viewYear.label}` : ''} · ongoing and upcoming first`}
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/events/new" className="btn-primary">
            + Add Event
          </Link>
        )}
      </div>

      {/* Empty state */}
      {!events || events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={viewYear ? `Nothing scheduled for ${viewYear.label}` : 'No events yet'}
          description={
            canManage
              ? 'Add an event to start assigning duties for it. Events are grouped by status — ongoing, upcoming, completed, then cancelled.'
              : 'Events scheduled for this academic year will appear here, with the soonest ones first.'
          }
          action={canManage ? { label: '+ Add an event', href: '/dashboard/events/new' } : undefined}
        />
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
      <div className={`md:hidden bg-white rounded-xl border border-black/6 overflow-hidden ${muted ? 'opacity-60' : ''}`}>
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
      <div className={`hidden md:block bg-white rounded-xl border border-black/6 overflow-hidden ${muted ? 'opacity-60' : ''}`}>
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