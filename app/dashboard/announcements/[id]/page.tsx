import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import DeleteAnnouncementButton from './DeleteAnnouncementButton'
import AnnouncementReceipt from './AnnouncementReceipt'
import PinToggleButton from './PinToggleButton'
import { Pin } from 'lucide-react'

// Expandable name list for the admin read-receipt card.
function NameList({ label, names, color }: { label: string; names: string[]; color: string }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ fontSize: '12.5px', color: '#555', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontWeight: 700, color }}>{names.length}</span> {label}
      </summary>
      <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '6px 0 0 14px', lineHeight: 1.7 }}>
        {names.length > 0 ? names.join(', ') : '—'}
      </p>
    </details>
  )
}

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

  // ── Read receipts (db/2026-announcement-reads.sql) ──
  // Audience = the people the visibility setting addresses; consultants manage
  // announcements rather than acknowledge them.
  const isAudience =
    profile.system_role !== 'consultant' &&
    (a.visibility === 'all' ||
      (a.visibility === 'creative_heads' && profile.system_role === 'creative_head') ||
      (a.visibility === 'members' && profile.system_role === 'member'))

  const { data: myRead } = await supabase
    .from('announcement_reads')
    .select('acknowledged_at')
    .eq('announcement_id', id)
    .eq('profile_id', user.id)
    .maybeSingle()

  const canSeeStats = profile.system_role === 'consultant' || profile.system_role === 'creative_head'
  let stats: { acked: string[]; seenOnly: string[]; pending: string[]; total: number; unavailable: boolean } | null = null
  if (canSeeStats) {
    let audienceQuery = supabase.from('profiles').select('id, full_name').eq('is_active', true)
    if (a.visibility === 'creative_heads') audienceQuery = audienceQuery.eq('system_role', 'creative_head')
    else if (a.visibility === 'members') audienceQuery = audienceQuery.eq('system_role', 'member')
    else audienceQuery = audienceQuery.in('system_role', ['creative_head', 'member'])

    const [{ data: audience }, { data: reads, error: readsError }] = await Promise.all([
      audienceQuery.order('full_name'),
      supabase.from('announcement_reads').select('profile_id, acknowledged_at').eq('announcement_id', id),
    ])

    const readMap = new Map((reads ?? []).map(r => [r.profile_id, r]))
    const acked: string[] = []
    const seenOnly: string[] = []
    const pending: string[] = []
    for (const p of audience ?? []) {
      const r = readMap.get(p.id)
      if (r?.acknowledged_at) acked.push(p.full_name)
      else if (r) seenOnly.push(p.full_name)
      else pending.push(p.full_name)
    }
    stats = { acked, seenOnly, pending, total: (audience ?? []).length, unavailable: !!readsError }
  }

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
        <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-7" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, background: bgColor, color: textColor, padding: '3px 10px', borderRadius: '99px' }}>
                {visibilityLabel[a.visibility]}
              </span>
              {a.pinned === true && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', color: '#CC0000', textTransform: 'uppercase' }}>
                  <Pin size={11} /> Pinned
                </span>
              )}
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
            <p style={{ fontSize: '12.5px', color: '#6b7280' }}>
              <span style={{ fontWeight: 500, color: '#555' }}>{a.poster?.full_name ?? '—'}</span>
              <span style={{ color: '#ccc', margin: '0 6px' }}>·</span>
              {new Date(a.created_at).toLocaleDateString('en-PH', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="px-5 py-6 sm:px-7">
          <div style={{ fontSize: '14.5px', color: '#333', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {a.content}
          </div>
        </div>
      </div>

      {/* Acknowledge bar — audience members only */}
      {isAudience && (
        <AnnouncementReceipt
          announcementId={a.id}
          profileId={user.id}
          initialSeen={!!myRead}
          initialAcknowledgedAt={myRead?.acknowledged_at ?? null}
        />
      )}

      {/* Read receipts — admins only */}
      {stats && (
        <div className="px-5 py-5 sm:px-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px', marginBottom: '14px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '10px' }}>
            Read Receipts
          </p>
          {stats.unavailable ? (
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
              Read receipts aren&apos;t set up yet — run <code style={{ fontFamily: "'DM Mono', monospace" }}>db/2026-announcement-reads.sql</code> in the Supabase SQL editor.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>
                Acknowledged by <strong style={{ color: '#16a34a' }}>{stats.acked.length}</strong> of{' '}
                <strong>{stats.total}</strong>
                {' · '}seen by <strong style={{ color: '#ca8a04' }}>{stats.acked.length + stats.seenOnly.length}</strong>
              </p>
              <NameList label="acknowledged" names={stats.acked} color="#16a34a" />
              <NameList label="seen, not yet acknowledged" names={stats.seenOnly} color="#ca8a04" />
              <NameList label="not yet seen" names={stats.pending} color="#CC0000" />
            </>
          )}
        </div>
      )}

      {/* Actions — only for authorized users */}
      {(canEdit || canDelete) && (
        <div className="px-5 py-5 sm:px-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px' }}>
          <p style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '12px' }}>
            Actions
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {canEdit && (
              <Link href={`/dashboard/announcements/${a.id}/edit`} className="btn-secondary">
                Edit Announcement
              </Link>
            )}
            {canEdit && (
              <PinToggleButton announcementId={a.id} pinned={a.pinned === true} />
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