import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import DeleteAnnouncementButton from './DeleteAnnouncementButton'

const visibilityStyle: Record<string, [string, string]> = {
  all:            ['#f0fdf4', '#16a34a'],
  creative_heads: ['#eff6ff', '#3b82f6'],
  members:        ['#f5f3ff', '#7c3aed'],
}

const visibilityLabel: Record<string, string> = {
  all: 'Everyone', creative_heads: 'Creative Heads', members: 'Members',
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
  if (!profile) redirect('/login')

  const { data: a } = await supabase
    .from('announcements')
    .select(`*, academic_years ( label ), poster:profiles!announcements_posted_by_fkey ( id, full_name )`)
    .eq('id', id)
    .single()

  if (!a) redirect('/dashboard/announcements')

  const isConsultant = profile.system_role === 'consultant'
  const isPoster = a.posted_by === user.id
  const canDelete = isConsultant
  const canEdit = isConsultant || isPoster

  const [bgColor, textColor] = visibilityStyle[a.visibility] ?? ['#f3f4f6', '#6b7280']

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Back */}
      <Link href="/dashboard/announcements"
        style={{ fontSize: '13px', color: '#bbb', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}
        className="hover:text-gray-600 transition-colors">
        ← Back to Announcements
      </Link>

      {/* Main card */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
        {/* Header stripe */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, background: bgColor, color: textColor, padding: '3px 10px', borderRadius: '99px' }}>
              {visibilityLabel[a.visibility]}
            </span>
            {a.academic_years?.label && (
              <span style={{ fontSize: '11.5px', color: '#bbb' }}>{a.academic_years.label}</span>
            )}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px', color: '#111', lineHeight: 1.25, marginBottom: '12px' }}>
            {a.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, flexShrink: 0 }}>
              {a.poster?.full_name?.charAt(0) ?? '?'}
            </div>
            <p style={{ fontSize: '12.5px', color: '#888' }}>
              <span style={{ fontWeight: 500, color: '#555' }}>{a.poster?.full_name ?? '—'}</span>
              <span style={{ color: '#ccc', margin: '0 6px' }}>·</span>
              {new Date(a.created_at).toLocaleDateString('en-PH', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Content body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: '14.5px', color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {a.content}
          </div>
        </div>
      </div>

      {/* Actions — only for authorized users */}
      {(canEdit || canDelete) && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '20px 24px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999', marginBottom: '12px' }}>
            Actions
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {canEdit && (
              <Link href={`/dashboard/announcements/${a.id}/edit`} className="btn-secondary">
                Edit Announcement
              </Link>
            )}
            {canDelete && (
              <DeleteAnnouncementButton announcementId={a.id} title={a.title} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}