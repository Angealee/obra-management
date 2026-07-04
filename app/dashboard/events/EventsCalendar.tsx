import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseDateOnly } from '@/lib/relativeDate'

// Month-grid view of the year's events. Fully server-rendered — month
// navigation is plain links (?view=calendar&month=YYYY-MM), no client state.
// Desktop cells show titled chips; on mobile the chips collapse to dots and
// the day cell itself links to nothing (tap targets stay the chips/desktop).

type CalEvent = {
  id: string
  title: string
  event_date: string
  status: string
}

const STATUS_DOT: Record<string, string> = {
  upcoming: '#3b82f6',
  ongoing: '#ca8a04',
  completed: '#16a34a',
  cancelled: '#9ca3af',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function EventsCalendar({
  events,
  month,      // 'YYYY-MM'
  todayStr,   // 'YYYY-MM-DD' in Asia/Manila
  prevHref,
  nextHref,
}: {
  events: CalEvent[]
  month: string
  todayStr: string
  prevHref: string
  nextHref: string
}) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leadingBlanks = first.getDay()

  const byDay = new Map<number, CalEvent[]>()
  for (const ev of events) {
    const d = parseDateOnly(ev.event_date)
    if (d.getFullYear() !== y || d.getMonth() !== m - 1) continue
    const list = byDay.get(d.getDate()) ?? []
    list.push(ev)
    byDay.set(d.getDate(), list)
  }

  const monthLabel = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Link href={prevHref} aria-label="Previous month" className="btn-secondary" style={{ padding: '6px 10px', display: 'inline-flex' }}>
          <ChevronLeft size={15} />
        </Link>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111', letterSpacing: '-0.2px', margin: 0 }}>
          {monthLabel}
        </p>
        <Link href={nextHref} aria-label="Next month" className="btn-secondary" style={{ padding: '6px 10px', display: 'inline-flex' }}>
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        {WEEKDAYS.map(d => (
          <p key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', padding: '8px 0', margin: 0, fontFamily: "'DM Mono', monospace" }}>
            {d}
          </p>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`b${i}`} style={{ minHeight: 74, background: '#FAFAF9', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }} />
          }
          const dateStr = `${month}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const dayEvents = byDay.get(day) ?? []
          return (
            <div
              key={day}
              style={{
                minHeight: 74,
                padding: '6px 6px 8px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                background: isToday ? '#FFF8F8' : '#fff',
              }}
            >
              <p style={{
                fontSize: 11.5,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? '#fff' : '#555',
                background: isToday ? '#CC0000' : 'transparent',
                width: 20, height: 20, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 0 4px',
              }}>
                {day}
              </p>

              {/* Desktop: titled chips */}
              <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 3 }}>
                {dayEvents.slice(0, 3).map(ev => (
                  <Link key={ev.id} href={`/dashboard/events/${ev.id}`} title={ev.title}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10.5, fontWeight: 500, color: '#333', textDecoration: 'none',
                      background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: 5, padding: '2px 5px',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[ev.status] ?? '#9ca3af', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>+{dayEvents.length - 3} more</p>
                )}
              </div>

              {/* Mobile: dots only */}
              <div className="flex md:hidden" style={{ gap: 3, flexWrap: 'wrap' }}>
                {dayEvents.slice(0, 4).map(ev => (
                  <Link key={ev.id} href={`/dashboard/events/${ev.id}`} aria-label={ev.title}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[ev.status] ?? '#9ca3af', display: 'block' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  )
}
