import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { CalendarRange, List } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'
import { phTodayStr } from '@/lib/relativeDate'
import EventsCalendar from './EventsCalendar'
import EventsList from './EventsList'
import DutiesBoard, { fetchDutiesBoardData } from '../duties/DutiesBoard'

// The DUTIES & EVENTS hub (admins only — members use /dashboard/duties and
// their dashboard). One page, three bodies, dispatched by URL params:
//   /dashboard/events                → Events tab, list view (?page= history)
//   /dashboard/events?view=calendar  → Events tab, month calendar (?month=)
//   /dashboard/events?tab=duties     → All Duties tab (?dpage= history)
// ?page= and ?dpage= are deliberately distinct so each tab keeps its own
// pagination; tab-strip links use fresh hrefs so the other tab's params drop.

function TabStrip({ active }: { active: 'events' | 'duties' }) {
  const tabs = [
    { key: 'events', label: 'Events', href: '/dashboard/events' },
    { key: 'duties', label: 'All Duties', href: '/dashboard/events?tab=duties' },
  ] as const
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: 20 }}>
      {tabs.map(t => {
        const isActive = t.key === active
        return (
          <Link
            key={t.key}
            href={t.href}
            style={{
              padding: '7px 14px',
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#111' : '#6b7280',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid #CC0000' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

export default async function DutiesEventsHub({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; dpage?: string; view?: string; month?: string }>
}) {
  const { user, profile } = await requireProfile()
  if (profile.system_role === 'member') redirect('/dashboard')

  const supabase = await createClient()
  const { viewYear, viewYearId } = await getAcademicYearContext()
  const params = await searchParams

  const todayStr = phTodayStr()
  const isDuties = params.tab === 'duties'
  const isCalendar = !isDuties && params.view === 'calendar'
  const month = /^\d{4}-\d{2}$/.test(params.month ?? '') ? params.month! : todayStr.slice(0, 7)
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const dpage = Math.max(1, parseInt(params.dpage ?? '1', 10) || 1)

  const canManage = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  // All Duties tab data — fetched only when that tab is active so the
  // default Events tab pays nothing for it.
  const dutiesData = isDuties
    ? await fetchDutiesBoardData(supabase, { viewYearId, userId: user.id, isHead: true, page: dpage })
    : null

  const subtitle = dutiesData
    ? `${dutiesData.counts.pending} pending · ${dutiesData.counts.in_progress} in progress · ${dutiesData.counts.awaiting_review} awaiting review · ${dutiesData.reviewedTotal} reviewed`
    : isCalendar
      ? (viewYear ? `Calendar · ${viewYear.label}` : 'Calendar')
      : (viewYear?.label ?? 'Events and duties in one place.')

  // ── View toggle (List | Calendar) — Events tab only ──
  const toggle = !isDuties && (
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

  return (
    <div className="page-enter">
      {/* Header — shared across all three bodies. Both actions stay visible on
          both tabs (the tour anchors [data-tour="add-event"/"add-duty"] must
          exist on the default tab); emphasis follows the active tab. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Duties &amp; Events</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {toggle}
            <Link
              href="/dashboard/events/new"
              className={isDuties ? 'btn-secondary' : 'btn-primary'}
              data-tour="add-event"
            >
              + Add Event
            </Link>
            <Link
              href="/dashboard/duties/new"
              className={isDuties ? 'btn-primary' : 'btn-secondary'}
              data-tour="add-duty"
            >
              + Assign Duty
            </Link>
          </div>
        )}
      </div>

      <TabStrip active={isDuties ? 'duties' : 'events'} />

      {/* ── ALL DUTIES tab ── */}
      {dutiesData ? (
        <DutiesBoard
          data={dutiesData}
          isHead
          userId={user.id}
          page={dpage}
          pagerHrefFor={p => '/dashboard/events?tab=duties' + (p > 1 ? `&dpage=${p}` : '')}
          empty={{
            title: 'No duties this year yet',
            description: 'Assign a duty to a member for one of this year’s events.',
            action: { label: '+ Assign a duty', href: '/dashboard/duties/new' },
          }}
        />
      ) : isCalendar ? (
        // ── EVENTS tab · calendar view ──
        <CalendarBody supabase={supabase} viewYearId={viewYearId} month={month} todayStr={todayStr} />
      ) : (
        // ── EVENTS tab · list view ──
        <EventsList
          viewYear={viewYear}
          viewYearId={viewYearId}
          todayStr={todayStr}
          page={page}
          canManage={canManage}
        />
      )}
    </div>
  )
}

async function CalendarBody({
  supabase,
  viewYearId,
  month,
  todayStr,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  viewYearId: string | null
  month: string
  todayStr: string
}) {
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
    <EventsCalendar
      events={(monthEvents ?? []) as any[]}
      month={month}
      todayStr={todayStr}
      prevHref={shift(-1)}
      nextHref={shift(1)}
    />
  )
}
