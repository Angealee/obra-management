import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile, AnnouncementWithPoster } from '@/types/database'
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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.4px', color: '#111', lineHeight: 1.1 }}>
            Announcements
          </h1>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
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
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#bbb' }}>No announcements yet.</p>
          {isHead && (
            <Link href="/dashboard/announcements/new"
              style={{ display: 'inline-block', marginTop: '12px', fontSize: '13px', color: '#999', textDecoration: 'underline' }}>
              Post the first announcement
            </Link>
          )}
        </div>
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
                        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
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
                        Posted by <span style={{ color: '#888', fontWeight: 500 }}>{a.poster?.full_name ?? '—'}</span>
                    </p>
                    <span style={{ color: '#ddd' }}>·</span>
                    <p style={{ fontSize: '11.5px', color: '#bbb' }}>
                        {new Date(a.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
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