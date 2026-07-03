import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AnnouncementWithPoster } from '@/types/database'
import { requireProfile } from '@/lib/auth'
import EmptyState from '@/components/EmptyState'
import { Megaphone } from 'lucide-react'
import { getAcademicYearContext } from '@/lib/academicYear'

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

  const { data: announcements } = await announcementsQuery as { data: AnnouncementWithPoster[] | null }

  // Admin-only acknowledgment chips: one reads query for the whole list plus
  // the active-audience sizes per role. Gracefully absent until the
  // db/2026-announcement-reads.sql migration has been applied (reads = null).
  let ackCounts: Record<string, number> | null = null
  let audience = { creative_head: 0, member: 0 }
  if (isHead && announcements && announcements.length > 0) {
    const [{ data: reads }, { data: activeProfiles }] = await Promise.all([
      supabase
        .from('announcement_reads')
        .select('announcement_id, acknowledged_at')
        .in('announcement_id', announcements.map(a => a.id)),
      supabase
        .from('profiles')
        .select('system_role')
        .eq('is_active', true)
        .in('system_role', ['creative_head', 'member']),
    ])
    if (reads) {
      ackCounts = {}
      for (const r of reads) {
        if (r.acknowledged_at) ackCounts[r.announcement_id] = (ackCounts[r.announcement_id] ?? 0) + 1
      }
      audience = {
        creative_head: (activeProfiles ?? []).filter(p => p.system_role === 'creative_head').length,
        member: (activeProfiles ?? []).filter(p => p.system_role === 'member').length,
      }
    }
  }
  const audienceFor = (visibility: string) =>
    visibility === 'creative_heads' ? audience.creative_head
    : visibility === 'members' ? audience.member
    : audience.creative_head + audience.member

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
            Announcements
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
            {announcements?.length ?? 0} announcement{(announcements?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {isHead && (
          <Link href="/dashboard/announcements/new" className="btn-primary">
            + Post Announcement
          </Link>
        )}
      </div>

      {/* List */}
      {!announcements || announcements.length === 0 ? (
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
          {announcements.map(a => {
            const [bgColor, textColor] = visibilityStyle[a.visibility] ?? ['#f3f4f6', '#6b7280']
            return (
                <Link
                key={a.id}
                href={`/dashboard/announcements/${a.id}`}
                style={{ textDecoration: 'none' }}
                >
                <div className="announcement-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#111', lineHeight: 1.3, marginBottom: '5px' }}>
                        {a.title}
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {a.content}
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, background: bgColor, color: textColor, padding: '3px 10px', borderRadius: '99px' }}>
                        {visibilityLabel[a.visibility]}
                        </span>
                        {a.academic_years?.label && (
                        <span style={{ fontSize: '11px', color: '#bbb' }}>{a.academic_years.label}</span>
                        )}
                    </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: '11.5px', color: '#bbb' }}>
                        Posted by <span style={{ color: '#6b7280', fontWeight: 500 }}>{a.poster?.full_name ?? '—'}</span>
                    </p>
                    <span style={{ color: '#ddd' }}>·</span>
                    <p style={{ fontSize: '11.5px', color: '#bbb' }}>
                        {new Date(a.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
                    {ackCounts && (
                      <>
                        <span style={{ color: '#ddd' }}>·</span>
                        <p style={{ fontSize: '11.5px', color: (ackCounts[a.id] ?? 0) > 0 ? '#16a34a' : '#bbb' }}>
                          ✓ {ackCounts[a.id] ?? 0}/{audienceFor(a.visibility)} acknowledged
                        </p>
                      </>
                    )}
                    </div>
                </div>
                </Link>
            )
            })}
        </div>
      )}
    </div>
  )
}