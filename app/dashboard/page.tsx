import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import {
  Users, CalendarDays, ListChecks, FileText, CheckCircle2, Clock, XCircle,
  Activity, ClipboardCheck, Trophy, Medal, type LucideIcon,
} from 'lucide-react'

// Valid-format UUID that matches no row — used to force an empty result set when
// a year has no events (keeps every query uniformly a Supabase query for typing).
const NONE_UUID = '00000000-0000-0000-0000-000000000000'

// ─── Design tokens ───────────────────────────────────────
const T = {
  card:    'bg-white rounded-[10px] border border-black/[0.06]',
  cardHov: 'hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)] hover:border-black/[0.10] transition-all duration-200',
  label:   { fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: '#999' },
  row:     'flex items-center justify-between p-3 rounded-lg hover:bg-black/[0.025] transition-colors duration-150 group',
}

// ─── Stat card ───────────────────────────────────────────
function Stat({ label, value, sub, href, accent, icon: Icon }: {
  label: string; value: number | string; sub?: string; href?: string; accent: string; icon: LucideIcon
}) {
  const inner = (
    <div className={`${T.card} ${href ? T.cardHov : ''} group p-5 flex flex-col gap-3`}>
      <div
        className="transition-transform duration-200 group-hover:scale-110"
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${accent}1a`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={17} strokeWidth={2.25} />
      </div>
      <div>
        <p style={T.label}>{label}</p>
        <p style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.15, color: accent, fontFamily: "'DM Sans', sans-serif", marginTop: '4px' }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}

// ─── Status badge ─────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:     ['#f3f4f6', '#6b7280'],
    in_progress: ['#eff6ff', '#3b82f6'],
    completed:   ['#fefce8', '#ca8a04'],
    reviewed:    ['#f0fdf4', '#16a34a'],
    upcoming:    ['#eff6ff', '#3b82f6'],
    ongoing:     ['#fefce8', '#ca8a04'],
    cancelled:   ['#f3f4f6', '#9ca3af'],
  }
  const labels: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed',
    reviewed: 'Reviewed', upcoming: 'Upcoming', ongoing: 'Ongoing', cancelled: 'Cancelled',
  }
  const [bg, color] = map[status] ?? ['#f3f4f6', '#6b7280']
  return (
    <span style={{ background: bg, color, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
      {labels[status] ?? status}
    </span>
  )
}

// ─── Section heading ──────────────────────────────────────
function SectionHead({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p style={T.label}>{title}</p>
      {action && (
        <Link href={action.href} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}
          className="hover:text-gray-700 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  )
}

// ─── Top contributor rank badges ──────────────────────────
const RANK_BADGES: { icon: LucideIcon; color: string; bg: string }[] = [
  { icon: Trophy, color: '#ca8a04', bg: '#fef9c3' }, // gold
  { icon: Medal,  color: '#94a3b8', bg: '#f1f5f9' }, // silver
  { icon: Medal,  color: '#c2703d', bg: '#fdf1e7' }, // bronze
]

// ─── Avatar ───────────────────────────────────────────────
function Avatar({ name, size = 28, bg = '#111' }: { name: string; size?: number; bg?: string }) {
  const init = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, flexShrink: 0 }}>
      {init}
    </div>
  )
}

export default async function DashboardPage() {
  const { user, profile } = await requireProfile()
  const supabase = await createClient()

  // "Year in focus" follows the system-wide picker (cookie), defaulting to the
  // active year. Kept under the name `activeAY` so the rest of this page — which
  // already scopes events + workload stats to it — needs no other change.
  const { viewYear: activeAY } = await getAcademicYearContext()

  // ══════════════════════════════════════════
  //  CONSULTANT
  // ══════════════════════════════════════════
  if (profile.system_role === 'consultant') {
    const yearId = activeAY?.id ?? NONE_UUID

    // Events for the year in focus — their ids scope duties + workload marks.
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, status')
      .eq('academic_year_id', yearId)
      .order('event_date', { ascending: false })

    const ayEventIds = events?.map(e => e.id) ?? []
    const eventFilter = ayEventIds.length > 0 ? ayEventIds : [NONE_UUID]

    const [
      { count: totalMembers },
      { data: duties },
      { count: pendingApplications },
      { data: allMarks },
    ] = await Promise.all([
      supabase.from('academic_year_members').select('*', { count: 'exact', head: true }).eq('academic_year_id', yearId),
      supabase.from('duties').select('id, title, status, assigned_to, event_id, events(title), assignee:profiles!duties_assigned_to_fkey(full_name)').in('event_id', eventFilter).order('created_at', { ascending: false }).limit(200),
      supabase.from('member_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('workload_marks').select('mark').in('event_id', eventFilter),
    ])

    const lateMarks  = allMarks?.filter(m => m.mark === 'late').length ?? 0
    const dndMarks   = allMarks?.filter(m => m.mark === 'did_not_duty').length ?? 0
    const doneMarks  = allMarks?.filter(m => m.mark === 'completed').length ?? 0

    const byStatus = (s: string) => duties?.filter(d => d.status === s).length ?? 0
    const total = duties?.length ?? 0
    const pending = byStatus('pending')
    const inProg  = byStatus('in_progress')
    const compl   = byStatus('completed')
    const rev     = byStatus('reviewed')

    type MemberStats = { name: string; total: number; reviewed: number; events: Set<string> }
    const memberStats: Record<string, MemberStats> = {}
    for (const d of duties ?? []) {
      if (!d.assigned_to) continue
      const name = (d as any).assignee?.full_name ?? 'Unknown'
      if (!memberStats[d.assigned_to]) memberStats[d.assigned_to] = { name, total: 0, reviewed: 0, events: new Set() }
      const m = memberStats[d.assigned_to]
      m.total++
      if (d.status === 'reviewed') m.reviewed++
      if (d.event_id) m.events.add(d.event_id)
    }
    const topMembers = Object.entries(memberStats)
      .filter(([, m]) => m.reviewed > 0)
      .sort((a, b) => b[1].reviewed - a[1].reviewed)
      .slice(0, 5)

    const upcoming = events?.filter(e => e.status === 'upcoming').length ?? 0
    const ongoing  = events?.filter(e => e.status === 'ongoing').length ?? 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
              Good day, {profile.full_name.split(' ')[0]}.
            </h1>
            <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
              {activeAY
                ? <><span style={{ color: '#bbb' }}>Active year</span> &nbsp;{activeAY.label}</>
                : 'No active academic year set.'
              }
            </p>
          </div>
          {!activeAY && (
            <Link href="/dashboard/academic-years"
              style={{ fontSize: '12.5px', color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '7px 14px', textDecoration: 'none' }}>
              Set an active academic year
            </Link>
          )}
        </div>

        

        {/* ── 4 stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Stat label="Active Members" value={totalMembers ?? 0} accent="#3b82f6" icon={Users} href="/dashboard/members" />
          <Stat label="Events This AY" value={events?.length ?? 0} sub={`${upcoming} upcoming · ${ongoing} ongoing`} accent="#7c3aed" icon={CalendarDays} href="/dashboard/events" />
          <Stat label="Total Duties" value={total} sub={`${rev} reviewed`} accent="#0891b2" icon={ListChecks} href="/dashboard/duties" />
          <Stat label="Pending Applications" value={pendingApplications ?? 0} accent="#ca8a04" icon={FileText} href="/dashboard/applications" />
        </div>

        {/* Expand to 3 columns on second row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Stat label="Marked Completed" value={doneMarks}  accent="#16a34a" icon={CheckCircle2} href="/dashboard/workloads" />
          <Stat label="Marked Late"      value={lateMarks}  accent="#ca8a04" icon={Clock}        href="/dashboard/workloads" />
          <Stat label="Did Not Duty"     value={dndMarks}   accent="#CC0000" icon={XCircle}      href="/dashboard/workloads" />
        </div>
        
        {/* ── Duty overview ── */}
        <div className={`${T.card} p-6`}>
          <SectionHead title="Duty Overview" action={{ label: 'View all →', href: '/dashboard/duties' }} />

          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '1px', background: 'rgba(0,0,0,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
            {[
              { label: 'Pending',     val: pending, color: '#555' },
              { label: 'In Progress', val: inProg,  color: '#3b82f6' },
              { label: 'Completed',   val: compl,   color: '#ca8a04', note: 'awaiting review' },
              { label: 'Reviewed',    val: rev,     color: '#16a34a' },
            ].map(item => (
              <div key={item.label} style={{ background: '#fff', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: item.color, letterSpacing: '-0.3px', lineHeight: 1 }}>{item.val}</p>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '4px', fontWeight: 500 }}>{item.label}</p>
                {item.note && <p style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>{item.note}</p>}
              </div>
            ))}
          </div>

          {total > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#bbb' }}>Progress</span>
                <span style={{ fontSize: '11px', color: '#bbb' }}>{Math.round((rev / total) * 100)}% reviewed</span>
              </div>
              <div style={{ height: '5px', background: '#f0f0ee', borderRadius: '99px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ background: '#d1d5db', width: `${(pending / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#93c5fd', width: `${(inProg  / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#fde047', width: `${(compl   / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#4ade80', width: `${(rev     / total) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#bbb' }}>No duties assigned yet.</p>
          )}
        </div>

        {/* ── Top contributors ── */}
        <div className={`${T.card} p-6`}>
          <SectionHead title="Top Contributors" />
          {topMembers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#bbb' }}>No reviewed duties yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topMembers.map(([id, data], i) => {
                const rate = data.total > 0 ? Math.round((data.reviewed / data.total) * 100) : 0
                const badge = RANK_BADGES[i]
                return (
                  <Link key={id} href={`/dashboard/members/${id}`}
                    className={`${T.card} ${T.cardHov} p-4 flex flex-col gap-3 relative`}
                    style={{ textDecoration: 'none' }}>
                    {badge && (
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 24, height: 24, borderRadius: '50%',
                        background: badge.bg, color: badge.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <badge.icon size={13} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={data.name} size={36} bg={i === 0 ? '#111' : '#d1d5db'} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</p>
                        <p style={{ fontSize: '11px', color: '#aaa' }}>#{i + 1} contributor</p>
                      </div>
                    </div>
                    <div>
                      <div style={{ height: '4px', background: '#f0f0ee', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ height: '100%', width: `${rate}%`, background: '#16a34a', transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#999' }}>{data.reviewed}/{data.total} reviewed</span>
                        <span style={{ fontSize: '11px', color: '#999' }}>{data.events.size} event{data.events.size !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Events list ── */}
        {events && events.length > 0 && (
          <div className={`${T.card} p-6`}>
            <SectionHead title="Events This Academic Year" action={{ label: 'View all →', href: '/dashboard/events' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {events.slice(0, 6).map(ev => (
                <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                    <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge status={ev.status} />
                    <span style={{ fontSize: '14px', color: '#ddd' }} className="group-hover:text-gray-400 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════
  //  CREATIVE HEAD
  // ══════════════════════════════════════════
  if (profile.system_role === 'creative_head') {
    const yearId = activeAY?.id ?? NONE_UUID

    // Duties are scoped to the year through their event via an inner join
    // (events!inner + filter on events.academic_year_id) — no separate
    // "fetch event ids first" round-trip needed.
    const [
      { data: events },
      { data: myDuties },
      { data: allDuties },
    ] = await Promise.all([
      supabase.from('events').select('id, title, event_date, status').eq('academic_year_id', yearId).in('status', ['upcoming','ongoing']).order('event_date', { ascending: true }).limit(6),
      supabase.from('duties').select('id, title, status, event_id, events!inner(title)').eq('assigned_to', user.id).neq('status', 'reviewed').eq('events.academic_year_id', yearId).order('created_at', { ascending: false }).limit(8),
      supabase.from('duties').select('id, title, status, assigned_to, event_id, assignee:profiles!duties_assigned_to_fkey(full_name), events!inner(title)').eq('assigned_by', user.id).eq('events.academic_year_id', yearId).order('created_at', { ascending: false }).limit(50),
    ])

    const pendingReview = allDuties?.filter(d => d.status === 'completed') ?? []
    const myPending  = myDuties?.filter(d => d.status === 'pending').length ?? 0
    const myInProg   = myDuties?.filter(d => d.status === 'in_progress').length ?? 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
            Good day, {profile.full_name.split(' ')[0]}.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
            <p style={{ fontSize: '13px', color: '#999' }}>{activeAY?.label ?? 'No active academic year'}</p>
            {profile.creative_head_role && profile.creative_head_role !== 'none' && (
              <span style={{ fontSize: '10.5px', fontWeight: 600, background: '#eff6ff', color: '#3b82f6', padding: '2px 9px', borderRadius: '99px', textTransform: 'capitalize' as const }}>
                {profile.creative_head_role.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Stat label="My Pending"       value={myPending}            accent="#64748b" icon={Clock}          href="/dashboard/duties" />
          <Stat label="In Progress"      value={myInProg}             accent="#3b82f6" icon={Activity}       href="/dashboard/duties" />
          <Stat label="Awaiting Review"  value={pendingReview.length} accent="#ca8a04" icon={ClipboardCheck} href="/dashboard/duties" />
          <Stat label="Upcoming Events"  value={events?.length ?? 0}  accent="#7c3aed" icon={CalendarDays}   href="/dashboard/events" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className={`${T.card} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <p style={T.label}>Needs Review</p>
              {pendingReview.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#fefce8', color: '#ca8a04', padding: '2px 9px', borderRadius: '99px' }}>
                  {pendingReview.length}
                </span>
              )}
            </div>
            {pendingReview.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bbb' }}>Nothing to review ✓</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {pendingReview.slice(0, 5).map(d => (
                  <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                      <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                        {(d as any).assignee?.full_name} · {(d as any).events?.title}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: '#ca8a04', background: '#fefce8', padding: '3px 9px', borderRadius: '6px', flexShrink: 0, marginLeft: '8px' }}>Review</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className={`${T.card} p-6`}>
            <SectionHead title="Upcoming Events" action={{ label: 'View all →', href: '/dashboard/events' }} />
            {!events || events.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bbb' }}>No upcoming events.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {events.map(ev => (
                  <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                      <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                        {new Date(ev.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge status={ev.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {myDuties && myDuties.length > 0 && (
          <div className={`${T.card} p-6`}>
            <SectionHead title="My Active Duties" action={{ label: 'View all →', href: '/dashboard/duties' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {myDuties.map(d => (
                <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                    <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>{(d as any).events?.title}</p>
                  </div>
                  <Badge status={d.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════
  //  MEMBER
  // ══════════════════════════════════════════
  const yearId = activeAY?.id ?? NONE_UUID

  // Year scoping via inner join on the duty's event (no pre-fetch of event ids).
  const [{ data: myDuties }, { data: myEvents }] = await Promise.all([
    supabase.from('duties').select('id, title, status, duty_type, priority, due_date, events!inner(id, title, event_date)')
      .eq('assigned_to', user.id).eq('events.academic_year_id', yearId).order('created_at', { ascending: false }),
    supabase.from('events').select('id, title, event_date, status')
      .eq('academic_year_id', yearId).in('status', ['upcoming','ongoing'])
      .order('event_date', { ascending: true }).limit(5),
  ])

  const byS = (s: string) => myDuties?.filter(d => d.status === s).length ?? 0
  const mPend = byS('pending'), mProg = byS('in_progress')
  const mComp = byS('completed'), mRev = byS('reviewed')
  const mTotal = myDuties?.length ?? 0
  const active = myDuties?.filter(d => d.status === 'pending' || d.status === 'in_progress') ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
          Good day, {profile.full_name.split(' ')[0]}.
        </h1>
        <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>{activeAY?.label ?? 'No active academic year'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Stat label="Pending"     value={mPend} accent="#64748b" icon={Clock}        href="/dashboard/duties" />
        <Stat label="In Progress" value={mProg} accent="#3b82f6" icon={Activity}     href="/dashboard/duties" />
        <Stat label="Completed"   value={mComp} accent="#ca8a04" icon={CheckCircle2} href="/dashboard/duties" />
        <Stat label="Reviewed"    value={mRev}  accent="#16a34a" icon={Trophy}       href="/dashboard/duties" />
      </div>

      {mTotal > 0 && (
        <div className={`${T.card} p-6`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={T.label}>My Progress</p>
            <span style={{ fontSize: '12px', color: '#bbb' }}>{mRev} of {mTotal} reviewed</span>
          </div>
          <div style={{ height: '5px', background: '#f0f0ee', borderRadius: '99px', display: 'flex', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ background: '#d1d5db', width: `${(mPend / mTotal) * 100}%` }} />
            <div style={{ background: '#93c5fd', width: `${(mProg / mTotal) * 100}%` }} />
            <div style={{ background: '#fde047', width: `${(mComp / mTotal) * 100}%` }} />
            <div style={{ background: '#4ade80', width: `${(mRev  / mTotal) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[['#d1d5db','Pending'],['#93c5fd','In Progress'],['#fde047','Completed'],['#4ade80','Reviewed']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#bbb' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className={`${T.card} p-6`}>
          <SectionHead title="My Active Duties" action={{ label: 'View all →', href: '/dashboard/duties' }} />
          {active.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#bbb' }}>No active duties right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {active.slice(0, 5).map(d => (
                <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                    <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                      {(d as any).events?.title}
                      {d.due_date && ` · Due ${new Date(d.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: '8px' }}><Badge status={d.status} /></div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={`${T.card} p-6`}>
          <SectionHead title="Upcoming Events" action={{ label: 'View all →', href: '/dashboard/events' }} />
          {!myEvents || myEvents.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#bbb' }}>No upcoming events.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {myEvents.map(ev => (
                <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                    <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Badge status={ev.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {mRev > 0 && (
        <div className={`${T.card} p-6`}>
          <SectionHead title="Reviewed Accomplishments" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {myDuties?.filter(d => d.status === 'reviewed').slice(0, 5).map(d => (
              <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                  <p style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>{(d as any).events?.title}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '3px 9px', borderRadius: '6px' }}>Reviewed ★</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}