import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { getAcademicYearContext } from '@/lib/academicYear'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import Avatar from '@/components/ui/Avatar'
import CountUp from '@/components/ui/CountUp'
import { DutyStatusBadge, EventStatusBadge } from '@/components/ui/StatusBadge'
import { T } from '@/components/ui/tokens'
import {
  Users, CalendarDays, ListChecks, FileText, CheckCircle2, Clock, XCircle,
  Activity, ClipboardCheck, Trophy, Medal, AlertTriangle, CalendarPlus,
  ListPlus, Megaphone, History, Pin, type LucideIcon,
} from 'lucide-react'
import { daysFromToday, parseDateOnly, phTodayStr } from '@/lib/relativeDate'
import DashboardGreeting from './DashboardGreeting'

// Valid-format UUID that matches no row — used to force an empty result set when
// a year has no events (keeps every query uniformly a Supabase query for typing).
const NONE_UUID = '00000000-0000-0000-0000-000000000000'

// Design tokens shared via components/ui/tokens.ts (card / label / row dialect).

// ─── Completion ring: one data-true graphic anchor (SVG donut) ───
function Ring({ percent, color }: { percent: number; color: string }) {
  const r = 15.5
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, percent))
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" aria-label={`${p}% reviewed`} style={{ flexShrink: 0 }}>
      <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={4} />
      <circle
        cx={20} cy={20} r={r} fill="none"
        stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform="rotate(-90 20 20)"
      />
      <text x={20} y={23} textAnchor="middle" fontSize={9} fontFamily="'DM Mono', monospace" fill="#555">
        {p}%
      </text>
    </svg>
  )
}

// ─── Stat card: Bebas scoreboard numerals, count-up, hover accent bar ───
function Stat({ label, value, sub, href, accent, icon: Icon, ring }: {
  label: string; value: number | string; sub?: string; href?: string; accent: string; icon: LucideIcon; ring?: number
}) {
  const inner = (
    <div className={`${T.card} ${href ? T.cardHov : ''} group stat-card-x p-5 flex flex-col gap-3`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
        {ring !== undefined && <Ring percent={ring} color={accent} />}
      </div>
      <div>
        <p style={T.label}>{label}</p>
        <span className="stat-accent" aria-hidden="true" />
        <p style={{ fontSize: '34px', fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.05, color: accent, fontFamily: "'Bebas Neue', sans-serif", marginTop: '5px' }}>
          {typeof value === 'number' ? <CountUp value={value} /> : value}
        </p>
        {sub && <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}

// ─── Editorial masthead: mono kicker + Bebas greeting + filmstrip ghost ───
function Masthead({
  name,
  yearLabel,
  aside,
}: {
  name: string
  yearLabel: string | null
  aside?: React.ReactNode
}) {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' }).format(now)
  const date = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }).format(now)
  const kicker = [`${weekday} · ${date}`, yearLabel].filter(Boolean).join(' · ').toUpperCase()

  // Manila wall-clock hour, computed on the server so the greeting's first
  // client render matches the server HTML (see DashboardGreeting).
  const serverHour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', hourCycle: 'h23' }).format(now)
  )

  return (
    <div style={{ position: 'relative', paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
      {/* Filmstrip ghost — the brand asset, barely there, fading out rightward */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: -6, left: 0, right: 0, height: 72,
          backgroundImage: 'url(/filmstrip.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          opacity: 0.05,
          maskImage: 'linear-gradient(to right, black 30%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to right, black 30%, transparent 85%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'DM Mono', monospace", fontSize: '10.5px', fontWeight: 500,
            letterSpacing: '0.14em', color: '#6b7280', margin: '0 0 6px',
          }}>
            <span style={{ width: 8, height: 8, background: '#CC0000', flexShrink: 0 }} />
            {kicker}
          </p>
          <DashboardGreeting name={name} serverHour={serverHour} />
        </div>
        {aside}
      </div>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────
function SectionHead({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p style={T.label}>{title}</p>
      {action && (
        <Link href={action.href} style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}
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

// ─── Quick actions (admins): the three most common jobs, one click from home ─
function QuickActions({ consultant }: { consultant: boolean }) {
  const actions: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/dashboard/events/new', label: 'New Event', icon: CalendarPlus },
    { href: '/dashboard/duties/new', label: 'Assign Duty', icon: ListPlus },
    { href: '/dashboard/announcements/new', label: 'Post Announcement', icon: Megaphone },
    ...(consultant
      ? [
          { href: '/dashboard/reports', label: 'Reports', icon: FileText },
          { href: '/dashboard/activity', label: 'Activity Log', icon: History },
        ]
      : []),
  ]
  return (
    <div data-tour="quick-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {actions.map(a => (
        <Link key={a.href} href={a.href} className="quick-action">
          <a.icon size={14} strokeWidth={2} />
          {a.label}
        </Link>
      ))}
    </div>
  )
}

// ─── Overdue callout: reuses the duties urgency system on the home screen ───
function OverdueStrip({ count, scope }: { count: number; scope: 'you' | 'team' | 'org' }) {
  if (count === 0) return null
  const message =
    scope === 'you'
      ? `You have ${count} overdue dut${count !== 1 ? 'ies' : 'y'}.`
      : scope === 'team'
        ? `${count} dut${count !== 1 ? 'ies are' : 'y is'} overdue across your assignees.`
        : `${count} dut${count !== 1 ? 'ies are' : 'y is'} overdue this year.`
  return (
    <Link
      href="/dashboard/duties"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
        padding: '11px 16px',
      }}
    >
      <AlertTriangle size={15} style={{ color: '#CC0000', flexShrink: 0 }} />
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', margin: 0, flex: 1 }}>
        {message}
      </p>
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#CC0000', flexShrink: 0 }}>Review →</span>
    </Link>
  )
}

// ─── Latest announcements with unread dots ──────────────────────────────────
type MiniAnnouncement = { id: string; title: string; created_at: string; pinned?: boolean; isUnread: boolean }

function AnnouncementsMini({ items }: { items: MiniAnnouncement[] }) {
  return (
    <div className={`${T.card} p-6`}>
      <SectionHead title="Latest Announcements" action={{ label: 'View all →', href: '/dashboard/announcements' }} />
      {items.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#6b7280' }}>Nothing posted yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {items.map(a => (
            <Link key={a.id} href={`/dashboard/announcements/${a.id}`} className={T.row} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: a.isUnread ? '#CC0000' : 'rgba(0,0,0,0.10)',
                }} />
                {a.pinned === true && <Pin size={11} style={{ color: '#CC0000', flexShrink: 0 }} />}
                <p style={{
                  fontSize: '14px', fontWeight: a.isUnread ? 650 : 500, color: '#111', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {a.title}
                </p>
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0, marginLeft: 10 }}>
                {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/** Latest 4 announcements for the viewing year + the viewer's unread state. */
async function fetchLatestAnnouncements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  yearId: string,
  profileId: string,
  role: string,
): Promise<MiniAnnouncement[]> {
  const { data } = await supabase
    .from('announcements')
    .select('id, title, created_at, visibility, pinned')
    .or(`academic_year_id.eq.${yearId},academic_year_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(4)
  const list = (data ?? []) as any[]
  if (list.length === 0) return []

  const { data: reads } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('profile_id', profileId)
    .in('announcement_id', list.map(a => a.id))
  const readSet = new Set((reads ?? []).map(r => r.announcement_id))

  const inAudience = (a: any) =>
    role !== 'consultant' &&
    (a.visibility === 'all' ||
      (a.visibility === 'creative_heads' && role === 'creative_head') ||
      (a.visibility === 'members' && role === 'member'))

  return list.map(a => ({ ...a, isUnread: inAudience(a) && !readSet.has(a.id) }))
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
    const todayStr = phTodayStr()

    // Events for the year in focus — their ids scope duties + workload marks.
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, status')
      .eq('academic_year_id', yearId)
      .order('event_date', { ascending: false })

    const ayEventIds = events?.map(e => e.id) ?? []
    const eventFilter = ayEventIds.length > 0 ? ayEventIds : [NONE_UUID]

    // Duty stat cards are exact DB counts (correct at any duty volume — the
    // old approach fetched 200 rows and counted in JS, silently undercounting
    // past the cap). The four buckets partition every duty exactly once:
    // pending / in_progress / awaiting review (completed, no reviewer) /
    // reviewed (completed + reviewer, or legacy status='reviewed').
    const dutyCount = () =>
      supabase
        .from('duties')
        .select('id, events!inner(id)', { count: 'exact', head: true })
        .eq('events.academic_year_id', yearId)

    const [
      { count: totalMembers },
      { count: pendingApplications },
      { data: allMarks },
      { data: activeMembers },
      { count: pendingCount },
      { count: inProgCount },
      { count: awaitingCount },
      { count: reviewedCount },
      { data: contribDuties },
      { count: overdueCount },
      annItems,
    ] = await Promise.all([
      supabase.from('academic_year_members').select('*', { count: 'exact', head: true }).eq('academic_year_id', yearId),
      supabase.from('member_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('workload_marks').select('mark, member_id').in('event_id', eventFilter),
      supabase.from('profiles').select('id').eq('is_active', true).neq('system_role', 'consultant'),
      dutyCount().eq('status', 'pending'),
      dutyCount().eq('status', 'in_progress'),
      dutyCount().eq('status', 'completed').is('reviewed_by', null),
      dutyCount().or('and(status.eq.completed,reviewed_by.not.is.null),status.eq.reviewed'),
      // Top Contributors: lean columns only, scoped through the event join.
      // The high ceiling is a payload guard, not a stats cap — the cards above
      // stay exact regardless.
      supabase
        .from('duties')
        .select('assigned_to, event_id, status, reviewed_by, assignee:profiles!duties_assigned_to_fkey(full_name, avatar_url), events!inner(academic_year_id)')
        .eq('events.academic_year_id', yearId)
        .not('assigned_to', 'is', null)
        .limit(2000),
      dutyCount().in('status', ['pending', 'in_progress']).lt('due_date', todayStr),
      fetchLatestAnnouncements(supabase, yearId, user.id, 'consultant'),
    ])

    // Only count marks for members who actually appear in the Workload Matrix
    // (active, non-consultant). This keeps the dashboard's mark stats in sync
    // with the matrix, which hides inactive members — otherwise a stale mark
    // left on a since-deactivated member shows on the dashboard but nowhere else.
    const activeMemberIds = new Set((activeMembers ?? []).map(m => m.id))
    const visibleMarks = (allMarks ?? []).filter(m => activeMemberIds.has(m.member_id))
    const lateMarks  = visibleMarks.filter(m => m.mark === 'late').length
    const dndMarks   = visibleMarks.filter(m => m.mark === 'did_not_duty').length
    const doneMarks  = visibleMarks.filter(m => m.mark === 'completed').length

    const pending = pendingCount ?? 0
    const inProg  = inProgCount ?? 0
    const compl   = awaitingCount ?? 0
    const rev     = reviewedCount ?? 0
    const total   = pending + inProg + compl + rev

    type MemberStats = { name: string; avatar: string | null; total: number; reviewed: number; events: Set<string> }
    const memberStats: Record<string, MemberStats> = {}
    for (const d of contribDuties ?? []) {
      if (!d.assigned_to) continue
      const name = (d as any).assignee?.full_name ?? 'Unknown'
      const avatar = (d as any).assignee?.avatar_url ?? null
      if (!memberStats[d.assigned_to]) memberStats[d.assigned_to] = { name, avatar, total: 0, reviewed: 0, events: new Set() }
      const m = memberStats[d.assigned_to]
      m.total++
      if (dutyDisplayStatus(d) === 'reviewed') m.reviewed++
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

        <Masthead
          name={profile.full_name.split(' ')[0]}
          yearLabel={activeAY?.label ?? null}
          aside={!activeAY ? (
            <Link href="/dashboard/academic-years"
              style={{ fontSize: '12.5px', color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '7px 14px', textDecoration: 'none' }}>
              Set an active academic year
            </Link>
          ) : undefined}
        />

        <OverdueStrip count={overdueCount ?? 0} scope="org" />
        <QuickActions consultant />



        {/* ── 4 stat cards ── */}
        <div data-tour="stats" className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Stat label="Active Members" value={totalMembers ?? 0} accent="#3b82f6" icon={Users} href="/dashboard/members" />
          <Stat label="Events This AY" value={events?.length ?? 0} sub={`${upcoming} upcoming · ${ongoing} ongoing`} accent="#7c3aed" icon={CalendarDays} href="/dashboard/events" />
          <Stat label="Total Duties" value={total} sub={`${rev} reviewed`} accent="#0891b2" icon={ListChecks} href="/dashboard/duties"
            ring={total > 0 ? Math.round((rev / total) * 100) : undefined} />
          <Stat label="Pending Applications" value={pendingApplications ?? 0} accent="#ca8a04" icon={FileText} href="/dashboard/applications" />
        </div>

        {/* Expand to 3 columns on second row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Stat label="Marked Completed" value={doneMarks}  accent="#16a34a" icon={CheckCircle2} href="/dashboard/workloads" />
          <Stat label="Marked Late"      value={lateMarks}  accent="#ca8a04" icon={Clock}        href="/dashboard/workloads" />
          <Stat label="Did Not Duty"     value={dndMarks}   accent="#CC0000" icon={XCircle}      href="/dashboard/workloads" />
        </div>

        <AnnouncementsMini items={annItems as MiniAnnouncement[]} />

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
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', fontWeight: 500 }}>{item.label}</p>
                {item.note && <p style={{ fontSize: '10px', color: '#bbb', marginTop: '2px' }}>{item.note}</p>}
              </div>
            ))}
          </div>

          {total > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Progress</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{Math.round((rev / total) * 100)}% reviewed</span>
              </div>
              <div style={{ height: '5px', background: '#f0f0ee', borderRadius: '99px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ background: '#d1d5db', width: `${(pending / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#93c5fd', width: `${(inProg  / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#fde047', width: `${(compl   / total) * 100}%`, transition: 'width 0.5s ease' }} />
                <div style={{ background: '#4ade80', width: `${(rev     / total) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#bbb' }}>No duties assigned for this academic year yet.</p>
          )}
        </div>

        {/* ── Top contributors ── */}
        <div className={`${T.card} p-6`}>
          <SectionHead title="Top Contributors" />
          {topMembers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#bbb' }}>Members rank here once their duties start getting reviewed.</p>
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
                      <Avatar name={data.name} src={data.avatar} size={36} bg={i === 0 ? '#111' : '#d1d5db'} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.name}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>#{i + 1} contributor</p>
                      </div>
                    </div>
                    <div>
                      <div style={{ height: '4px', background: '#f0f0ee', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ height: '100%', width: `${rate}%`, background: '#16a34a', transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{data.reviewed}/{data.total} reviewed</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{data.events.size} event{data.events.size !== 1 ? 's' : ''}</span>
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
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                    <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <EventStatusBadge status={ev.status} />
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
      annItems,
    ] = await Promise.all([
      supabase.from('events').select('id, title, event_date, status').eq('academic_year_id', yearId).in('status', ['upcoming','ongoing']).order('event_date', { ascending: true }).limit(6),
      supabase.from('duties').select('id, title, status, reviewed_by, due_date, event_id, events!inner(title)').eq('assigned_to', user.id).eq('events.academic_year_id', yearId).order('created_at', { ascending: false }).limit(20),
      supabase.from('duties').select('id, title, status, reviewed_by, due_date, assigned_to, event_id, assignee:profiles!duties_assigned_to_fkey(full_name), events!inner(title)').eq('assigned_by', user.id).eq('events.academic_year_id', yearId).order('created_at', { ascending: false }).limit(50),
      fetchLatestAnnouncements(supabase, yearId, user.id, 'creative_head'),
    ])

    // Overdue across this head's assignees (active statuses + past due date).
    const headToday = parseDateOnly(phTodayStr())
    const teamOverdue = (allDuties ?? []).filter(d =>
      (d.status === 'pending' || d.status === 'in_progress') &&
      d.due_date && daysFromToday(d.due_date, headToday) < 0
    ).length

    // "Awaiting review" = completed but not yet reviewed (reviewed_by unset).
    const pendingReview = allDuties?.filter(d => dutyDisplayStatus(d) === 'awaiting_review') ?? []
    // Drop reviewed duties from the head's own active list (can't express
    // "completed + reviewed_by null" as a DB filter, so filter in JS).
    const myActiveDuties = (myDuties?.filter(d => dutyDisplayStatus(d) !== 'reviewed') ?? []).slice(0, 8)
    const myPending  = myActiveDuties.filter(d => d.status === 'pending').length
    const myInProg   = myActiveDuties.filter(d => d.status === 'in_progress').length

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <Masthead
          name={profile.full_name.split(' ')[0]}
          yearLabel={activeAY?.label ?? null}
          aside={
            profile.creative_head_role && profile.creative_head_role !== 'none' ? (
              <span style={{ fontSize: '10.5px', fontWeight: 600, background: '#eff6ff', color: '#3b82f6', padding: '3px 10px', borderRadius: '99px', textTransform: 'capitalize' as const, marginBottom: 4 }}>
                {profile.creative_head_role.replace('_', ' ')}
              </span>
            ) : undefined
          }
        />

        <OverdueStrip count={teamOverdue} scope="team" />
        <QuickActions consultant={false} />

        <div data-tour="stats" className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Stat label="My Pending"       value={myPending}            accent="#64748b" icon={Clock}          href="/dashboard/duties" />
          <Stat label="In Progress"      value={myInProg}             accent="#3b82f6" icon={Activity}       href="/dashboard/duties" />
          <Stat label="Awaiting Review"  value={pendingReview.length} accent="#ca8a04" icon={ClipboardCheck} href="/dashboard/duties" />
          <Stat label="Upcoming Events"  value={events?.length ?? 0}  accent="#7c3aed" icon={CalendarDays}   href="/dashboard/events" />
        </div>

        <AnnouncementsMini items={annItems as MiniAnnouncement[]} />

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
              <p style={{ fontSize: '13px', color: '#bbb' }}>Nothing to review.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {pendingReview.slice(0, 5).map(d => (
                  <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                      <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
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
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                      <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
                        {new Date(ev.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <EventStatusBadge status={ev.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {myActiveDuties.length > 0 && (
          <div className={`${T.card} p-6`}>
            <SectionHead title="My Active Duties" action={{ label: 'View all →', href: '/dashboard/duties' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {myActiveDuties.map(d => (
                <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                    <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>{(d as any).events?.title}</p>
                  </div>
                  <DutyStatusBadge display={dutyDisplayStatus(d)} />
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
  const [{ data: myDuties }, { data: myEvents }, memberAnnItems] = await Promise.all([
    supabase.from('duties').select('id, title, status, reviewed_by, duty_type, priority, due_date, events!inner(id, title, event_date)')
      .eq('assigned_to', user.id).eq('events.academic_year_id', yearId).order('created_at', { ascending: false }),
    supabase.from('events').select('id, title, event_date, status')
      .eq('academic_year_id', yearId).in('status', ['upcoming','ongoing'])
      .order('event_date', { ascending: true }).limit(5),
    fetchLatestAnnouncements(supabase, yearId, user.id, 'member'),
  ])

  const memberToday = parseDateOnly(phTodayStr())
  const myOverdue = (myDuties ?? []).filter(d =>
    (d.status === 'pending' || d.status === 'in_progress') &&
    d.due_date && daysFromToday(d.due_date, memberToday) < 0
  ).length

  const mPend = myDuties?.filter(d => d.status === 'pending').length ?? 0
  const mProg = myDuties?.filter(d => d.status === 'in_progress').length ?? 0
  const mComp = myDuties?.filter(d => dutyDisplayStatus(d) === 'awaiting_review').length ?? 0
  const mRev  = myDuties?.filter(d => dutyDisplayStatus(d) === 'reviewed').length ?? 0
  const mTotal = myDuties?.length ?? 0
  const active = myDuties?.filter(d => d.status === 'pending' || d.status === 'in_progress') ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Masthead
        name={profile.full_name.split(' ')[0]}
        yearLabel={activeAY?.label ?? null}
      />

      <OverdueStrip count={myOverdue} scope="you" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Stat label="Pending"     value={mPend} accent="#64748b" icon={Clock}        href="/dashboard/duties" />
        <Stat label="In Progress" value={mProg} accent="#3b82f6" icon={Activity}     href="/dashboard/duties" />
        <Stat label="Awaiting Review" value={mComp} accent="#ca8a04" icon={CheckCircle2} href="/dashboard/duties" />
        <Stat label="Reviewed"    value={mRev}  accent="#16a34a" icon={Trophy}       href="/dashboard/duties"
          ring={mTotal > 0 ? Math.round((mRev / mTotal) * 100) : undefined} />
      </div>

      <AnnouncementsMini items={memberAnnItems as MiniAnnouncement[]} />

      {mTotal > 0 && (
        <div className={`${T.card} p-6`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={T.label}>My Progress</p>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{mRev} of {mTotal} reviewed</span>
          </div>
          <div style={{ height: '5px', background: '#f0f0ee', borderRadius: '99px', display: 'flex', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ background: '#d1d5db', width: `${(mPend / mTotal) * 100}%` }} />
            <div style={{ background: '#93c5fd', width: `${(mProg / mTotal) * 100}%` }} />
            <div style={{ background: '#fde047', width: `${(mComp / mTotal) * 100}%` }} />
            <div style={{ background: '#4ade80', width: `${(mRev  / mTotal) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[['#d1d5db','Pending'],['#93c5fd','In Progress'],['#fde047','Awaiting Review'],['#4ade80','Reviewed']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{l}</span>
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
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                    <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
                      {(d as any).events?.title}
                      {d.due_date && ` · Due ${new Date(d.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: '8px' }}><DutyStatusBadge display={dutyDisplayStatus(d)} /></div>
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
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{ev.title}</p>
                    <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
                      {new Date(ev.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <EventStatusBadge status={ev.status} />
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
            {myDuties?.filter(d => dutyDisplayStatus(d) === 'reviewed').slice(0, 5).map(d => (
              <Link key={d.id} href={`/dashboard/duties/${d.id}`} className={T.row} style={{ textDecoration: 'none' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{d.title}</p>
                  <p style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>{(d as any).events?.title}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '3px 9px', borderRadius: '6px' }}>Reviewed</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}