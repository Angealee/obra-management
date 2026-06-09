import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import ToggleActiveButton from './ToggleActiveButton'
import WorkloadBadge from '@/components/WorkLoadBadge'

const dutyStatusStyle: Record<string, [string, string]> = {
  pending:     ['#f3f4f6', '#6b7280'],
  in_progress: ['#eff6ff', '#3b82f6'],
  completed:   ['#fefce8', '#ca8a04'],
  reviewed:    ['#f0fdf4', '#16a34a'],
}

const dutyStatusLabel: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', reviewed: 'Reviewed',
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viewer } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!viewer || viewer.system_role === 'member') redirect('/dashboard')

  // Fetch member with skills
  const { data: member } = await supabase
    .from('profiles')
    .select(`*, profile_skills ( skill_id, member_skills ( id, name ) )`)
    .eq('id', id)
    .single() as { data: any | null }

  if (!member) redirect('/dashboard/members')

  // Fetch all duties for this member with event info
  const { data: duties } = await supabase
    .from('duties')
    .select(`
      id, title, duty_type, status, completed_at, created_at,
      event_id,
      events ( id, title, event_date, status )
    `)
    .eq('assigned_to', id)
    .order('created_at', { ascending: false })

  // Fetch workload marks for this member
  const { data: marks } = await supabase
    .from('workload_marks')
    .select('event_id, mark')
    .eq('member_id', id)

  // Build mark lookup: event_id -> mark
  const markMap: Record<string, string> = {}
  for (const m of marks ?? []) {
    markMap[m.event_id] = m.mark
  }

  // Group duties by event
  type DutyRow = {
    id: string; title: string; duty_type: string; status: string
    completed_at: string | null; event_id: string
    events: { id: string; title: string; event_date: string; status: string } | null
  }

  const eventMap: Record<string, { event: any; duties: DutyRow[] }> = {}
  for (const d of (duties ?? []) as any[]) {
    if (!d.event_id || !d.events) continue
    if (!eventMap[d.event_id]) {
      eventMap[d.event_id] = { event: d.events, duties: [] }
    }
    eventMap[d.event_id].duties.push(d)
  }

  const eventGroups = Object.values(eventMap).sort(
    (a, b) => new Date(b.event.event_date).getTime() - new Date(a.event.event_date).getTime()
  )

  // Stats
  const totalDuties   = duties?.length ?? 0
  const reviewedCount = duties?.filter(d => d.status === 'reviewed').length ?? 0
  const lateCount     = Object.values(markMap).filter(m => m === 'late').length
  const dndCount      = Object.values(markMap).filter(m => m === 'did_not_duty').length

  const skills = member.profile_skills?.map((ps: any) => ps.member_skills?.name).filter(Boolean) ?? []

  const roleLabels: Record<string, string> = {
    consultant: 'Consultant', creative_head: 'Creative Head', member: 'Member',
  }
  const creativeLabels: Record<string, string> = {
    creative_producer: 'Creative Producer',
    creative_writer: 'Creative Writer',
    creative_director: 'Creative Director',
  }

  const displayRole = member.system_role === 'creative_head' && member.creative_head_role && member.creative_head_role !== 'none'
    ? creativeLabels[member.creative_head_role]
    : roleLabels[member.system_role]

  const initials = member.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ maxWidth: '780px' }}>
      {/* Back */}
      <Link href="/dashboard/members"
        style={{ fontSize: '13px', color: '#bbb', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}
        className="hover:text-gray-600 transition-colors">
        ← Back to Members
      </Link>

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.full_name}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(0,0,0,0.07)' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>
                {member.full_name}
              </h1>
              {member.username && (
                <span style={{ fontSize: '13px', color: '#bbb' }}>@{member.username}</span>
              )}
              <span style={{ fontSize: '11px', fontWeight: 600, background: member.is_active ? '#f0fdf4' : '#f3f4f6', color: member.is_active ? '#16a34a' : '#9ca3af', padding: '3px 10px', borderRadius: '99px' }}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '99px' }}>
                {displayRole}
              </span>
              <span style={{ fontSize: '12px', color: '#bbb' }}>{member.email}</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(0,0,0,0.06)', borderRadius: '8px', overflow: 'hidden', marginTop: '20px' }}>
          {[
            { label: 'Total Duties',  value: totalDuties,   color: '#111' },
            { label: 'Reviewed',      value: reviewedCount, color: '#16a34a' },
            { label: 'Late',          value: lateCount,     color: '#ca8a04' },
            { label: 'Did Not Duty',  value: dndCount,      color: '#CC0000' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fafaf9', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: stat.color, letterSpacing: '-0.3px' }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '3px', fontWeight: 500 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profile info */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '14px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '14px' }}>
          Profile
        </p>
        {[
          ['Student Number', member.student_number ?? '—'],
          ['Course & Section', member.course_section ?? '—'],
          ['Year Level', member.year_level ?? '—'],
          ['Contact Number', member.contact_number ?? '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
            className="last:border-0">
            <span style={{ fontSize: '13px', color: '#999' }}>{label}</span>
            <span style={{ fontSize: '13px', color: '#333', fontWeight: 500 }}>{value}</span>
          </div>
        ))}

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{ paddingTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {skills.map((skill: string) => (
              <span key={skill} style={{ fontSize: '12px', fontWeight: 500, background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '99px' }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Event History */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '14px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>
          Event History &amp; Duties
        </p>

        {eventGroups.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#bbb' }}>No duties assigned yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {eventGroups.map(({ event, duties: eventDuties }) => {
              const mark = markMap[event.id] ?? null
              return (
                <div key={event.id} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Event header */}
                  <div style={{ background: '#fafaf9', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <Link href={`/dashboard/events/${event.id}`} style={{ fontSize: '13.5px', fontWeight: 600, color: '#111', textDecoration: 'none' }}
                        className="hover:text-gray-600 transition-colors">
                        {event.title}
                      </Link>
                      <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px' }}>
                        {new Date(event.event_date).toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <WorkloadBadge mark={mark} />
                  </div>

                  {/* Duties under this event */}
                  <div style={{ padding: '8px 0' }}>
                    {eventDuties.map((d, i) => {
                      const [bg, tc] = dutyStatusStyle[d.status] ?? ['#f3f4f6', '#6b7280']
                      return (
                        <Link key={d.id} href={`/dashboard/duties/${d.id}`}
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                          className="hover:bg-gray-50 transition-colors">
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{d.title}</p>
                            <p style={{ fontSize: '11.5px', color: '#bbb', marginTop: '2px', textTransform: 'capitalize' }}>
                              {d.duty_type.replace('_', ' ')}
                            </p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, background: bg, color: tc, padding: '3px 10px', borderRadius: '99px' }}>
                            {dutyStatusLabel[d.status] ?? d.status}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Account Status — consultant only */}
      {viewer.system_role === 'consultant' && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '8px' }}>
            Account Status
          </p>
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '14px' }}>
            Inactive members cannot log in but their records are preserved.
          </p>
          <ToggleActiveButton memberId={member.id} isActive={member.is_active} memberName={member.full_name} />
        </div>
      )}
    </div>
  )
}