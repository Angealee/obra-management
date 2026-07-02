import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ObraEventWithDetails } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import Pager from '@/components/Pager'
import { EventStatusBadge } from '@/components/ui/StatusBadge'
import { CalendarDays } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'

// Completed-events history paginates; ongoing/upcoming/cancelled always show in full.
const HISTORY_PAGE_SIZE = 10

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()

  const { viewYear, viewYearId } = await getAcademicYearContext()
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  // Open events (ongoing/upcoming/cancelled) always show in full — they're
  // bounded within a year. COMPLETED events are the growing history, so they
  // are fetched separately with a count and paginated (?page=).
  const EVENT_COLUMNS = `
    *,
    academic_years ( label ),
    profiles ( full_name )
  `
  const [{ data: openEvents }, { data: completedEvents, count: completedCount }] = viewYearId
    ? await Promise.all([
        supabase
          .from('events')
          .select(EVENT_COLUMNS)
          .eq('academic_year_id', viewYearId)
          .in('status', ['upcoming', 'ongoing', 'cancelled'])
          .order('event_date', { ascending: false }) as any,
        supabase
          .from('events')
          .select(EVENT_COLUMNS, { count: 'exact' })
          .eq('academic_year_id', viewYearId)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .range((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE - 1) as any,
      ])
    : [{ data: [] as ObraEventWithDetails[] }, { data: [] as ObraEventWithDetails[], count: 0 }]

  const open = (openEvents ?? []) as ObraEventWithDetails[]
  const grouped = {
    upcoming:  open.filter(e => e.status === 'upcoming'),
    ongoing:   open.filter(e => e.status === 'ongoing'),
    completed: ((completedEvents ?? []) as ObraEventWithDetails[]),
    cancelled: open.filter(e => e.status === 'cancelled'),
  }
  const completedTotal = completedCount ?? 0
  const totalPages = Math.max(1, Math.ceil(completedTotal / HISTORY_PAGE_SIZE))

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  const eventCount = open.length + completedTotal

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
      {eventCount === 0 ? (
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

          {/* Then completed — the growing history section, paginated */}
          {completedTotal > 0 && (
            <div>
              {grouped.completed.length > 0 && (
                <EventSection title="Completed" events={grouped.completed} />
              )}
              <Pager
                page={page}
                totalPages={totalPages}
                hrefFor={p => '/dashboard/events' + (p > 1 ? `?page=${p}` : '')}
              />
            </div>
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
              <EventStatusBadge status={event.status} />
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
                  <EventStatusBadge status={event.status} />
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