import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AnnouncementWithPoster } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import { Megaphone, Pin } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'
import { daysFromToday } from '@/lib/relativeDate'

const visibilityStyle: Record<string, [string, string]> = {
  all:            ['#f0fdf4', '#16a34a'],
  creative_heads: ['#eff6ff', '#3b82f6'],
  members:        ['#f5f3ff', '#7c3aed'],
}

const visibilityLabel: Record<string, string> = {
  all:            'Everyone',
  creative_heads: 'Creative Heads',
  members:        'Members',
}

type Enriched = AnnouncementWithPoster & { pinned?: boolean; isUnread: boolean }

// Quiet uppercase divider between list sections.
function GroupHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 2px' }}>
      {icon}
      <p className="section-label" style={{ margin: 0 }}>{label}</p>
    </div>
  )
}

function AnnouncementCard({
  a,
  showPill,
  ackChip,
}: {
  a: Enriched
  showPill: boolean
  ackChip?: string | null
}) {
  const [bgColor, textColor] = visibilityStyle[a.visibility] ?? ['#f3f4f6', '#6b7280']
  return (
    <Link href={`/dashboard/announcements/${a.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="announcement-card"
        style={a.isUnread ? { borderLeft: '3px solid #CC0000' } : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {a.isUnread && (
                <span aria-label="Unread" style={{ width: 7, height: 7, borderRadius: '50%', background: '#CC0000', flexShrink: 0 }} />
              )}
              {a.pinned === true && (
                <Pin size={12} style={{ color: '#CC0000', flexShrink: 0 }} aria-label="Pinned" />
              )}
              <p style={{ fontSize: '15px', fontWeight: a.isUnread ? 700 : 600, color: '#111', lineHeight: 1.3, margin: 0 }}>
                {a.title}
              </p>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, marginTop: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {a.content}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            {showPill && (
              <span style={{ fontSize: '11px', fontWeight: 600, background: bgColor, color: textColor, padding: '3px 10px', borderRadius: '99px' }}>
                {visibilityLabel[a.visibility]}
              </span>
            )}
            {a.academic_years?.label && (
              <span style={{ fontSize: '11px', color: '#bbb' }}>{a.academic_years.label}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '11.5px', color: '#bbb' }}>
            Posted by <span style={{ color: '#6b7280', fontWeight: 500 }}>{a.poster?.full_name ?? '—'}</span>
          </p>
          <span style={{ color: '#ddd' }}>·</span>
          <p style={{ fontSize: '11.5px', color: '#bbb' }}>
            {new Date(a.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {ackChip && (
            <>
              <span style={{ color: '#ddd' }}>·</span>
              <p style={{ fontSize: '11.5px', color: ackChip.startsWith('✓ 0') ? '#bbb' : '#16a34a' }}>{ackChip}</p>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function AnnouncementsPage() {
  const { profile } = await requireProfile()
  const supabase = await createClient()

  const isHead = profile.system_role === 'consultant' || profile.system_role === 'creative_head'

  const { viewYearId } = await getAcademicYearContext()

  // Show announcements tagged to the chosen year, plus untagged/global ones.
  let announcementsQuery = supabase
    .from('announcements')
    .select(`
      *,
      academic_years ( label ),
      poster:profiles!announcements_posted_by_fkey ( full_name )
    `)
    .order('created_at', { ascending: false })

  if (viewYearId) {
    announcementsQuery = announcementsQuery.or(
      `academic_year_id.eq.${viewYearId},academic_year_id.is.null`
    )
  }

  const { data: announcements } = await announcementsQuery as { data: (AnnouncementWithPoster & { pinned?: boolean })[] | null }
  const list = announcements ?? []

  // ── My read state (unread indicators) ──────────────────────────────────
  // Unread only means something for someone the announcement addresses:
  // consultants manage posts rather than read them, so they get ack chips
  // instead of unread dots. Degrades gracefully pre-migration (reads null).
  const { data: myReads } = list.length > 0
    ? await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('profile_id', profile.id)
    : { data: [] as { announcement_id: string }[] }
  const readSet = new Set((myReads ?? []).map(r => r.announcement_id))

  const inMyAudience = (a: AnnouncementWithPoster) =>
    profile.system_role !== 'consultant' &&
    (a.visibility === 'all' ||
      (a.visibility === 'creative_heads' && profile.system_role === 'creative_head') ||
      (a.visibility === 'members' && profile.system_role === 'member'))

  const enriched: Enriched[] = list.map(a => ({
    ...a,
    isUnread: inMyAudience(a) && !readSet.has(a.id),
  }))
  const unreadCount = enriched.filter(a => a.isUnread).length

  // ── Admin acknowledgment chips (one reads query for the whole list) ────
  let ackChipFor: ((a: Enriched) => string | null) = () => null
  if (isHead && list.length > 0) {
    const [{ data: reads }, { data: activeProfiles }] = await Promise.all([
      supabase
        .from('announcement_reads')
        .select('announcement_id, acknowledged_at')
        .in('announcement_id', list.map(a => a.id)),
      supabase
        .from('profiles')
        .select('system_role')
        .eq('is_active', true)
        .in('system_role', ['creative_head', 'member']),
    ])
    if (reads) {
      const counts: Record<string, number> = {}
      for (const r of reads) {
        if (r.acknowledged_at) counts[r.announcement_id] = (counts[r.announcement_id] ?? 0) + 1
      }
      const heads = (activeProfiles ?? []).filter(p => p.system_role === 'creative_head').length
      const members = (activeProfiles ?? []).filter(p => p.system_role === 'member').length
      const audienceFor = (v: string) =>
        v === 'creative_heads' ? heads : v === 'members' ? members : heads + members
      ackChipFor = a => `✓ ${counts[a.id] ?? 0}/${audienceFor(a.visibility)} acknowledged`
    }
  }

  // ── Sections: Pinned → This Week → Earlier; unread float within each ───
  const unreadFirst = (arr: Enriched[]) => [
    ...arr.filter(a => a.isUnread),
    ...arr.filter(a => !a.isUnread),
  ]
  const pinned = unreadFirst(enriched.filter(a => a.pinned === true))
  const rest = enriched.filter(a => a.pinned !== true)
  const thisWeek = unreadFirst(rest.filter(a => daysFromToday(a.created_at.slice(0, 10)) > -7))
  const earlier = unreadFirst(rest.filter(a => daysFromToday(a.created_at.slice(0, 10)) <= -7))

  const sections: { key: string; label: string; icon?: React.ReactNode; items: Enriched[] }[] = [
    { key: 'pinned', label: 'Pinned', icon: <Pin size={11} style={{ color: '#CC0000' }} />, items: pinned },
    { key: 'week', label: 'This Week', items: thisWeek },
    { key: 'earlier', label: 'Earlier', items: earlier },
  ].filter(s => s.items.length > 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
            Announcements
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
            {list.length === 0
              ? 'Nothing posted yet.'
              : unreadCount > 0
                ? <>{list.length} announcement{list.length !== 1 ? 's' : ''} · <strong style={{ color: '#CC0000' }}>{unreadCount} unread</strong></>
                : `${list.length} announcement${list.length !== 1 ? 's' : ''} · you're all caught up`}
          </p>
        </div>
        {isHead && (
          <Link href="/dashboard/announcements/new" className="btn-primary">
            + Post Announcement
          </Link>
        )}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nothing posted yet"
          description={
            isHead
              ? 'Post an announcement to reach members and creative heads. It shows up here and on their dashboards.'
              : 'Announcements from your creative heads will appear here once they’re posted.'
          }
          action={isHead ? { label: '+ Post an announcement', href: '/dashboard/announcements/new' } : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sections.map(section => (
            <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <GroupHeader label={section.label} icon={section.icon} />
              {section.items.map(a => (
                <AnnouncementCard
                  key={a.id}
                  a={a}
                  showPill={isHead}
                  ackChip={ackChipFor(a)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
