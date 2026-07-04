import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ObraEventWithDetails } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import Pager from '@/components/Pager'
import { EventStatusBadge } from '@/components/ui/StatusBadge'
import { CalendarDays, CalendarRange, List, Users } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'
import { parseDateOnly, phTodayStr, relativeDayLabel } from '@/lib/relativeDate'
import EventsCalendar from './EventsCalendar'

// Completed-events history paginates; ongoing/upcoming/cancelled always show in full.
const HISTORY_PAGE_SIZE = 10

type Coverage = { duties: number; members: number }

// Editorial calendar leaf: month band + big day number. Dates you can scan
// without reading.
function DateBlock({ dateStr, muted = false }: { dateStr: string; muted?: boolean }) {
  const d = parseDateOnly(dateStr)
  return (
    <div style={{
      width: 46, flexShrink: 0, textAlign: 'center',
      border: '1px solid rgba(0,0,0,0.09)', borderRadius: 9, overflow: 'hidden',
      background: '#fff', opacity: muted ? 0.55 : 1,
    }}>
      <div style={{
        background: '#0D0D0D', color: '#fff', fontSize: 8.5, fontWeight: 700,
        letterSpacing: '0.12em', padding: '3px 0', textTransform: 'uppercase',
        fontFamily: "'DM Mono', monospace",
      }}>
        {d.toLocaleDateString('en-PH', { month: 'short' })}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#111', padding: '3px 0 4px', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {d.getDate()}
      </div>
    </div>
  )
}

function CoverageLine({ c, upcoming }: { c: Coverage | undefined; upcoming: boolean }) {
  if (!c || c.duties === 0) {
    return upcoming
      ? <span style={{ fontSize: 11.5, color: '#b45309', fontWeight: 500 }}>No duties yet</span>
      : <span style={{ fontSize: 11.5, color: '#bbb' }}>—</span>
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#555', fontFamily: "'DM Mono', monospace" }}>
      <Users size={11} style={{ color: '#6b7280' }} />
      {c.duties} dut{c.duties !== 1 ? 'ies' : 'y'} · {c.members} member{c.members !== 1 ? 's' : ''}
    </span>
  )
}

function EventSection({
  title,
  events,
  coverage,
  todayStr,
  muted = false,
}: {
  title: string
  events: ObraEventWithDetails[]
  coverage: Map<string, Coverage>
  todayStr: string
  muted?: boolean
}) {
  const today = parseDateOnly(todayStr)
  return (
    <div>
      <h2 className="section-label" style={{ marginBottom: 10 }}>{title}</h2>

      {/* Mobile: stacked cards */}
      <div className={`md:hidden bg-white rounded-xl border border-black/6 overflow-hidden ${muted ? 'opacity-60' : ''}`}>
        {events.map(event => {
          const rel = relativeDayLabel(event.event_date, today)
          return (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="block px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <DateBlock dateStr={event.event_date} muted={muted} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                    <EventStatusBadge status={event.status} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>
                    {rel && <strong style={{ color: rel === 'Today' ? '#CC0000' : '#374151', fontWeight: 600 }}>{rel} · </strong>}
                    {event.event_time && `${event.event_time.slice(0, 5)} · `}
                    {event.location ?? 'No location'}
                  </p>
                  <div style={{ marginTop: 6 }}>
                    <CoverageLine c={coverage.get(event.id)} upcoming={event.status === 'upcoming'} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop: Table */}
      <div className={`hidden md:block bg-white rounded-xl border border-black/6 overflow-hidden ${muted ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Event</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Location</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Coverage</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
              <th className="text-left px-6 py-4 text-gray-500 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => {
              const rel = relativeDayLabel(event.event_date, today)
              return (
                <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50 transition last:border-0">
                  <td className="px-6 py-3.5">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <DateBlock dateStr={event.event_date} muted={muted} />
                      <div style={{ minWidth: 0 }}>
                        <p className="font-medium text-gray-800">{event.title}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                          {rel && <strong style={{ color: rel === 'Today' ? '#CC0000' : '#374151', fontWeight: 600 }}>{rel}</strong>}
                          {rel && (event.event_time || event.description) && ' · '}
                          {event.event_time && event.event_time.slice(0, 5)}
                          {!event.event_time && event.description && (
                            <span className="line-clamp-1">{event.description}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">{event.location ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    <CoverageLine c={coverage.get(event.id)} upcoming={event.status === 'upcoming'} />
                  </td>
                  <td className="px-6 py-3.5">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-6 py-3.5">
                    <Link href={`/dashboard/events/${event.id}`} className="text-gray-500 hover:text-gray-900 underline text-xs">
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

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; month?: string }>
}) {
  const { profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const params = await searchParams

  const todayStr = phTodayStr()
  const isCalendar = params.view === 'calendar'
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? params.month! : todayStr.slice(0, 7)
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // ── View toggle (List | Calendar) — server-rendered segmented links ──
  const toggle = (
    <div style={{ display: 'flex', gap: 3, background: '#F2F2F0', borderRadius: 9, padding: 3 }}>
      {[
        { key: 'list', label: 'List', icon: List, href: '/dashboard/events' },
        { key: 'calendar', label: 'Calendar', icon: CalendarRange, href: '/dashboard/events?view=calendar' },
      ].map(v => {
        const active = (v.key === 'calendar') === isCalendar
        return (
          <Link key={v.key} href={v.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7, textDecoration: 'none',
              background: active ? '#fff' : 'transparent',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              color: active ? '#CC0000' : '#6b7280',
              fontSize: 12.5, fontWeight: 600,
            }}>
            <v.icon size={13} />
            {v.label}
          </Link>
        )
      })}
    </div>
  )

  // ── CALENDAR VIEW ──────────────────────────────────────────────────────
  if (isCalendar) {
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    const { data: monthEvents } = viewYearId
      ? await supabase
          .from('events')
          .select('id, title, event_date, status')
          .eq('academic_year_id', viewYearId)
          .gte('event_date', `${month}-01`)
          .lte('event_date', `${month}-${String(daysInMonth).padStart(2, '0')}`)
          .order('event_date', { ascending: true })
      : { data: [] }

    const shift = (delta: number) => {
      const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1)
      return `/dashboard/events?view=calendar&month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    return (
      <div className="page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Events</h1>
            <p className="page-subtitle">{viewYear ? `Calendar · ${viewYear.label}` : 'Calendar'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {toggle}
            {canManage && <Link href="/dashboard/events/new" className="btn-primary" data-tour="add-event">+ Add Event</Link>}
          </div>
        </div>

        <EventsCalendar
          events={(monthEvents ?? []) as any[]}
          month={month}
          todayStr={todayStr}
          prevHref={shift(-1)}
          nextHref={shift(1)}
        />
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────
  // Open events (ongoing/upcoming/cancelled) always show in full, soonest
  // first. COMPLETED events are the growing history: fetched separately with
  // a count and paginated (?page=).
  const EVENT_COLUMNS = `
    *,
    academic_years ( label ),
    profiles ( full_name )
  `
  // Coverage rides in the same round trip: duties are scoped through the
  // event join by YEAR (not by the fetched ids), so the query is independent
  // of the event queries and all three run in parallel — no waterfall.
  const [{ data: openEvents }, { data: completedEvents, count: completedCount }, { data: yearDuties }] = viewYearId
    ? await Promise.all([
        supabase
          .from('events')
          .select(EVENT_COLUMNS)
          .eq('academic_year_id', viewYearId)
          .in('status', ['upcoming', 'ongoing', 'cancelled'])
          .order('event_date', { ascending: true }) as any,
        supabase
          .from('events')
          .select(EVENT_COLUMNS, { count: 'exact' })
          .eq('academic_year_id', viewYearId)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .range((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE - 1) as any,
        supabase
          .from('duties')
          .select('event_id, assigned_to, events!inner(academic_year_id)')
          .eq('events.academic_year_id', viewYearId)
          .limit(5000) as any,
      ])
    : [{ data: [] as ObraEventWithDetails[] }, { data: [] as ObraEventWithDetails[], count: 0 }, { data: [] }]

  const open = (openEvents ?? []) as ObraEventWithDetails[]
  const completed = (completedEvents ?? []) as ObraEventWithDetails[]

  // Staffing coverage per event, computed from the parallel duties fetch.
  const coverage = new Map<string, Coverage>()
  {
    const memberSets = new Map<string, Set<string>>()
    for (const d of (yearDuties ?? []) as any[]) {
      const c = coverage.get(d.event_id) ?? { duties: 0, members: 0 }
      c.duties++
      coverage.set(d.event_id, c)
      if (d.assigned_to) {
        const s = memberSets.get(d.event_id) ?? new Set()
        s.add(d.assigned_to)
        memberSets.set(d.event_id, s)
      }
    }
    for (const [id, s] of memberSets) {
      const c = coverage.get(id)
      if (c) c.members = s.size
    }
  }

  // Happening strip: ongoing events + anything dated today.
  const happening = open.filter(e => e.status === 'ongoing' || (e.status !== 'cancelled' && e.event_date === todayStr))
  const happeningIds = new Set(happening.map(e => e.id))

  const grouped = {
    upcoming:  open.filter(e => e.status === 'upcoming' && !happeningIds.has(e.id)),
    completed,
    cancelled: open.filter(e => e.status === 'cancelled'),
  }
  const completedTotal = completedCount ?? 0
  const totalPages = Math.max(1, Math.ceil(completedTotal / HISTORY_PAGE_SIZE))
  const eventCount = open.length + completedTotal

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">
            {eventCount === 0
              ? (viewYear ? `No events for ${viewYear.label} yet.` : 'Shoots, deadlines, and org activities.')
              : `${eventCount} event${eventCount !== 1 ? 's' : ''}${viewYear ? ` for ${viewYear.label}` : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {toggle}
          {canManage && <Link href="/dashboard/events/new" className="btn-primary" data-tour="add-event">+ Add Event</Link>}
        </div>
      </div>

      {/* Empty state */}
      {eventCount === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={viewYear ? `Nothing scheduled for ${viewYear.label}` : 'No events yet'}
          description={
            canManage
              ? 'Add an event to start assigning duties for it.'
              : 'Events scheduled for this academic year will appear here, with the soonest ones first.'
          }
          action={canManage ? { label: '+ Add an event', href: '/dashboard/events/new' } : undefined}
        />
      ) : (
        <div className="space-y-8">

          {/* ── HAPPENING — ongoing + today, unmissable ── */}
          {happening.length > 0 && (
            <div style={{ background: '#0D0D0D', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px 0' }}>
                <span className="live-dot" aria-hidden="true" />
                <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                  Happening
                </p>
              </div>
              <div style={{ padding: '10px 8px 8px' }}>
                {happening.map(ev => (
                  <Link key={ev.id} href={`/dashboard/events/${ev.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                      padding: '10px 10px', borderRadius: 8,
                    }}
                    className="hover:bg-white/[0.06] transition-colors">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '3px 0 0' }}>
                        {ev.status === 'ongoing' ? 'Ongoing' : 'Today'}
                        {ev.event_time && ` · ${ev.event_time.slice(0, 5)}`}
                        {ev.location && ` · ${ev.location}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>View →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {grouped.upcoming.length > 0 && (
            <EventSection title="Upcoming" events={grouped.upcoming} coverage={coverage} todayStr={todayStr} />
          )}

          {/* Completed — the growing history section, paginated */}
          {completedTotal > 0 && (
            <div>
              {completed.length > 0 && (
                <EventSection title={`Completed (${completedTotal})`} events={completed} coverage={coverage} todayStr={todayStr} />
              )}
              <Pager
                page={page}
                totalPages={totalPages}
                hrefFor={p => '/dashboard/events' + (p > 1 ? `?page=${p}` : '')}
              />
            </div>
          )}

          {grouped.cancelled.length > 0 && (
            <EventSection title="Cancelled" events={grouped.cancelled} coverage={coverage} todayStr={todayStr} muted />
          )}

        </div>
      )}
    </div>
  )
}
