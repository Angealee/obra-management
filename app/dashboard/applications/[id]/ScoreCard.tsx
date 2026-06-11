'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2 } from 'lucide-react'
import { getInitials, getAvatarColor } from '../utils'

type ScoreRow = {
  id: string
  scored_by: string
  score: number
  scorer?: { full_name: string } | null
}

type Props = {
  applicationId: string
  userId: string
  userRole: string
  scores: ScoreRow[]
}

export default function ScoreCard({ applicationId, userId, userRole, scores }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const canScore = userRole === 'consultant' || userRole === 'creative_head'

  const myScore = scores.find(s => s.scored_by === userId)
  const [hover, setHover] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canScore) return null

  const avg = scores.length
    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    : null

  const currentValue = hover || myScore?.score || 0

  async function setScore(n: number) {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('application_scores')
      .upsert(
        {
          application_id: applicationId,
          scored_by: userId,
          score: n,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,scored_by' }
      )
    setSaving(false)
    if (err) {
      setError('Failed to save score. Please try again.')
    } else {
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Average score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 34, fontWeight: 700, color: '#111', lineHeight: 1 }}>
            {avg !== null ? avg.toFixed(1) : '—'}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#999' }}>/ 10</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <Star
                key={n}
                size={13}
                style={{ color: '#ca8a04' }}
                fill={avg !== null && n <= Math.round(avg) ? '#ca8a04' : 'none'}
              />
            ))}
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: '#999' }}>
            Average from {scores.length} review{scores.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '8px 12px', color: '#dc2626',
          fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
        }}>
          {error}
        </div>
      )}

      {/* Your score */}
      <div>
        <p className="section-label" style={{ marginBottom: 8 }}>Your Score</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
              const filled = currentValue >= n
              return (
                <button
                  key={n}
                  type="button"
                  disabled={saving}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setScore(n)}
                  aria-label={`Rate ${n} out of 10`}
                  style={{
                    background: 'none', border: 'none', padding: 2, lineHeight: 0,
                    cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  <Star size={20} style={{ color: filled ? '#CC0000' : '#ddd' }} fill={filled ? '#CC0000' : 'none'} />
                </button>
              )
            })}
          </div>
          {saving && <Loader2 size={14} className="animate-spin" style={{ color: '#999' }} />}
          {!saving && myScore && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#111' }}>
              {myScore.score}/10
            </span>
          )}
          {!saving && !myScore && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#bbb' }}>
              Click a star to rate
            </span>
          )}
        </div>
      </div>

      {/* Per-reviewer breakdown */}
      {scores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <p className="section-label" style={{ marginBottom: 0 }}>Reviewer Breakdown</p>
          {scores.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: getAvatarColor(s.scorer?.full_name || s.scored_by),
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Sans, sans-serif', fontSize: 9, fontWeight: 700,
              }}>
                {getInitials(s.scorer?.full_name || '?')}
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: '#555', flex: 1 }}>
                {s.scorer?.full_name ?? 'Unknown reviewer'}
                {s.scored_by === userId && <span style={{ color: '#bbb' }}> (You)</span>}
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: '#111' }}>
                {s.score}/10
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
