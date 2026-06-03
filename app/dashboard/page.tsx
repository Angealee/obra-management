import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

// ── Reusable stat card ──
function StatCard({
  label,
  value,
  sub,
  href,
  color = 'text-gray-800',
}: {
  label: string
  value: number | string
  sub?: string
  href?: string
  color?: string
}) {
  const inner = (
    <div className="stat-card">
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1, color: color.includes('green') ? '#16a34a' : color.includes('red') ? '#CC0000' : '#111' }}>
        {value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{sub}</p>}
    </div>
  )
  if (href) return <Link href={href} className="stat-card-link">{inner}</Link>
  return inner
}

// ── Status badge ──
function Badge({ status }: { status: string }) {
  const s: Record<string, string> = {
    pending:     'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-yellow-100 text-yellow-700',
    reviewed:    'bg-green-100 text-green-700',
    upcoming:    'bg-blue-100 text-blue-700',
    ongoing:     'bg-yellow-100 text-yellow-700',
    cancelled:   'bg-gray-100 text-gray-400',
  }
  const l: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress',
    completed: 'Completed', reviewed: 'Reviewed',
    upcoming: 'Upcoming', ongoing: 'Ongoing', cancelled: 'Cancelled',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {l[status] ?? status}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  // Active academic year
  const { data: activeAY } = await supabase
    .from('academic_years')
    .select('*')
    .eq('is_active', true)
    .single()

  // ════════════════════════════════
  // CONSULTANT DASHBOARD
  // ════════════════════════════════
  if (profile.system_role === 'consultant') {
    const [
      { count: totalMembers },
      { count: totalHeads },
      { data: events },
      { data: duties },
      { data: recentMembers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('system_role', 'member').eq('is_active', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('system_role', 'creative_head').eq('is_active', true),
      supabase.from('events').select('id, title, event_date, status').eq('academic_year_id', activeAY?.id ?? '').order('event_date', { ascending: false }),
      supabase.from('duties').select('id, title, status, assigned_to, event_id, events(title), assignee:profiles!duties_assigned_to_fkey(full_name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, full_name, system_role, created_at').neq('system_role', 'consultant').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
    ])

    const pending     = duties?.filter(d => d.status === 'pending').length ?? 0
    const inProgress  = duties?.filter(d => d.status === 'in_progress').length ?? 0
    const completed   = duties?.filter(d => d.status === 'completed').length ?? 0
    const reviewed    = duties?.filter(d => d.status === 'reviewed').length ?? 0
    const total       = duties?.length ?? 0

    const upcoming  = events?.filter(e => e.status === 'upcoming').length ?? 0
    const ongoing   = events?.filter(e => e.status === 'ongoing').length ?? 0

    // Most active members (by reviewed duties)
    const memberDutyCount: Record<string, { name: string; count: number }> = {}
    for (const d of duties ?? []) {
      if (!d.assigned_to) continue
      const name = (d as any).assignee?.full_name ?? 'Unknown'
      if (!memberDutyCount[d.assigned_to]) memberDutyCount[d.assigned_to] = { name, count: 0 }
      if (d.status === 'reviewed') memberDutyCount[d.assigned_to].count++
    }
    const topMembers = Object.entries(memberDutyCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    const needsReview = duties?.filter(d => d.status === 'completed') ?? []

    return (
      <div className="space-y-8">
        {/* Welcome */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Good day, {profile.full_name.split(' ')[0]}.</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeAY ? `Active: ${activeAY.label}` : 'No active academic year set.'}
            </p>
          </div>
          {!activeAY && (
            <Link href="/dashboard/academic-years" className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-2 rounded-lg hover:bg-yellow-100 transition">
              ⚠ Set an active academic year
            </Link>
          )}
        </div>

        {/* Stat cards dito */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Members"    value={totalMembers ?? 0} href="/dashboard/members" />
          <StatCard label="Creative Heads"    value={totalHeads ?? 0}   href="/dashboard/members" />
          <StatCard label="Events This AY"    value={events?.length ?? 0} sub={`${upcoming} upcoming · ${ongoing} ongoing`} href="/dashboard/events" />
          <StatCard label="Reviewed Duties"   value={reviewed} sub={`of ${total} total`} color="text-green-600" href="/dashboard/duties" />
        </div>

        {/* Duty progress */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duty Overview</h2>
            <Link href="/dashboard/duties" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pending',     value: pending,    color: 'text-gray-700' },
              { label: 'In Progress', value: inProgress, color: 'text-blue-600' },
              { label: 'Completed',   value: completed,  color: 'text-yellow-600', note: 'awaiting review' },
              { label: 'Reviewed',    value: reviewed,   color: 'text-green-600' },
            ].map(item => (
              <div key={item.label} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Overall progress</span>
                <span>{Math.round((reviewed / total) * 100)}% reviewed</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-gray-300 transition-all" style={{ width: `${(pending / total) * 100}%` }} />
                <div className="h-full bg-blue-300 transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
                <div className="h-full bg-yellow-300 transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(reviewed / total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Needs review */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Awaiting Review</h2>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {needsReview.length}
              </span>
            </div>
            {needsReview.length === 0 ? (
              <p className="text-gray-400 text-sm">All duties are reviewed. ✓</p>
            ) : (
              <div className="space-y-2">
                {needsReview.slice(0, 5).map(d => (
                  <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.title}</p>
                      <p className="text-xs text-gray-400">{(d as any).assignee?.full_name} · {(d as any).events?.title}</p>
                    </div>
                    <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                  </Link>
                ))}
                {needsReview.length > 5 && (
                  <Link href="/dashboard/duties" className="block text-center text-xs text-gray-400 hover:text-gray-700 pt-2 underline">
                    +{needsReview.length - 5} more
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Top contributors */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Top Contributors</h2>
            {topMembers.length === 0 ? (
              <p className="text-gray-400 text-sm">No reviewed duties yet.</p>
            ) : (
              <div className="space-y-3">
                {topMembers.map(([id, data], i) => (
                  <Link key={id} href={`/dashboard/members/${id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-500' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {data.name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-gray-800 flex-1">{data.name}</p>
                    <span className="text-xs text-green-600 font-medium">{data.count} reviewed</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent events */}
        {events && events.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Events This Academic Year</h2>
              <Link href="/dashboard/events" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
            </div>
            <div className="space-y-2">
              {events.slice(0, 6).map(event => (
                <Link key={event.id} href={`/dashboard/events/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={event.status} />
                    <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════
  // CREATIVE HEAD DASHBOARD
  // ════════════════════════════════
  if (profile.system_role === 'creative_head') {
    const [
      { data: events },
      { data: myDuties },
      { data: allDuties },
      { data: members },
    ] = await Promise.all([
      supabase.from('events').select('id, title, event_date, status').eq('academic_year_id', activeAY?.id ?? '').in('status', ['upcoming', 'ongoing']).order('event_date', { ascending: true }).limit(5),
      supabase.from('duties').select('id, title, status, events(title)').eq('assigned_to', user.id).neq('status', 'reviewed').order('created_at', { ascending: false }).limit(5),
      supabase.from('duties').select('id, title, status, assigned_to, assignee:profiles!duties_assigned_to_fkey(full_name), events(title)').eq('assigned_by', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id, full_name').eq('system_role', 'member').eq('is_active', true),
    ])

    const pendingReview = allDuties?.filter(d => d.status === 'completed') ?? []
    const myPending = myDuties?.filter(d => d.status === 'pending').length ?? 0
    const myInProgress = myDuties?.filter(d => d.status === 'in_progress').length ?? 0

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Good day, {profile.full_name.split(' ')[0]}.</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeAY ? activeAY.label : 'No active academic year.'}
            {profile.creative_head_role && profile.creative_head_role !== 'none' && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                {profile.creative_head_role.replace('_', ' ')}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="My Pending Duties"    value={myPending}                  color={myPending > 0 ? 'text-gray-800' : 'text-gray-400'}   href="/dashboard/duties" />
          <StatCard label="My In Progress"       value={myInProgress}               color={myInProgress > 0 ? 'text-blue-600' : 'text-gray-400'} href="/dashboard/duties" />
          <StatCard label="Awaiting My Review"   value={pendingReview.length}       color={pendingReview.length > 0 ? 'text-yellow-600' : 'text-gray-400'} href="/dashboard/duties" />
          <StatCard label="Upcoming Events"      value={events?.length ?? 0}        href="/dashboard/events" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Duties needing review */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Needs Review</h2>
              {pendingReview.length > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{pendingReview.length}</span>
              )}
            </div>
            {pendingReview.length === 0 ? (
              <p className="text-gray-400 text-sm">Nothing to review right now. ✓</p>
            ) : (
              <div className="space-y-2">
                {pendingReview.slice(0, 5).map(d => (
                  <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.title}</p>
                      <p className="text-xs text-gray-400">{(d as any).assignee?.full_name} · {(d as any).events?.title}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Review</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upcoming Events</h2>
              <Link href="/dashboard/events" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
            </div>
            {!events || events.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming events.</p>
            ) : (
              <div className="space-y-2">
                {events.map(event => (
                  <Link key={event.id} href={`/dashboard/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={event.status} />
                      <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My duties */}
        {myDuties && myDuties.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">My Active Duties</h2>
              <Link href="/dashboard/duties" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
            </div>
            <div className="space-y-2">
              {myDuties.map(d => (
                <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.title}</p>
                    <p className="text-xs text-gray-400">{(d as any).events?.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={d.status} />
                    <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // MEMBER DASHBOARD
  const [
    { data: myDuties },
    { data: myEvents },
  ] = await Promise.all([
    supabase
      .from('duties')
      .select('id, title, status, duty_type, priority, due_date, events(id, title, event_date)')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, title, event_date, status')
      .eq('academic_year_id', activeAY?.id ?? '')
      .in('status', ['upcoming', 'ongoing'])
      .order('event_date', { ascending: true })
      .limit(5),
  ])

  const myPending    = myDuties?.filter(d => d.status === 'pending').length ?? 0
  const myProgress   = myDuties?.filter(d => d.status === 'in_progress').length ?? 0
  const myCompleted  = myDuties?.filter(d => d.status === 'completed').length ?? 0
  const myReviewed   = myDuties?.filter(d => d.status === 'reviewed').length ?? 0
  const myTotal      = myDuties?.length ?? 0

  const activeDuties = myDuties?.filter(d => d.status === 'pending' || d.status === 'in_progress') ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Good day, {profile.full_name.split(' ')[0]}.</h1>
        <p className="text-gray-500 text-sm mt-1">
          {activeAY ? activeAY.label : 'No active academic year.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending"    value={myPending}   color={myPending > 0 ? 'text-gray-800' : 'text-gray-400'}    href="/dashboard/duties" />
        <StatCard label="In Progress" value={myProgress}  color={myProgress > 0 ? 'text-blue-600' : 'text-gray-400'}   href="/dashboard/duties" />
        <StatCard label="Completed"  value={myCompleted} color={myCompleted > 0 ? 'text-yellow-600' : 'text-gray-400'} href="/dashboard/duties" />
        <StatCard label="Reviewed"   value={myReviewed}  color={myReviewed > 0 ? 'text-green-600' : 'text-gray-400'}   href="/dashboard/duties" />
      </div>

      {/* Progress bar */}
      {myTotal > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">My Progress</h2>
            <span className="text-xs text-gray-400">{myReviewed} of {myTotal} completed</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-gray-300" style={{ width: `${(myPending / myTotal) * 100}%` }} />
            <div className="h-full bg-blue-300" style={{ width: `${(myProgress / myTotal) * 100}%` }} />
            <div className="h-full bg-yellow-300" style={{ width: `${(myCompleted / myTotal) * 100}%` }} />
            <div className="h-full bg-green-500" style={{ width: `${(myReviewed / myTotal) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Pending', color: 'bg-gray-300' },
              { label: 'In Progress', color: 'bg-blue-300' },
              { label: 'Completed', color: 'bg-yellow-300' },
              { label: 'Reviewed', color: 'bg-green-500' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-xs text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active duties */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">My Active Duties</h2>
            <Link href="/dashboard/duties" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
          </div>
          {activeDuties.length === 0 ? (
            <p className="text-gray-400 text-sm">No active duties right now.</p>
          ) : (
            <div className="space-y-2">
              {activeDuties.slice(0, 5).map(d => (
                <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {(d as any).events?.title}
                      {d.due_date && ` · Due ${new Date(d.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge status={d.status} />
                    <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upcoming Events</h2>
            <Link href="/dashboard/events" className="text-xs text-gray-400 hover:text-gray-700 underline">View all</Link>
          </div>
          {!myEvents || myEvents.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming events.</p>
          ) : (
            <div className="space-y-2">
              {myEvents.map(event => (
                <Link key={event.id} href={`/dashboard/events/${event.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={event.status} />
                    <span className="text-gray-300 group-hover:text-gray-600 text-xs">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accomplishment history */}
      {myReviewed > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Reviewed Accomplishments</h2>
          <div className="space-y-2">
            {myDuties?.filter(d => d.status === 'reviewed').slice(0, 5).map(d => (
              <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group">
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.title}</p>
                  <p className="text-xs text-gray-400">{(d as any).events?.title}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Reviewed ★</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}