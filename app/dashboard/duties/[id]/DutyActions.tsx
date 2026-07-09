'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkloadBadge from '@/components/WorkLoadBadge'

type Outcome = 'completed' | 'late' | 'did_not_duty'

const OUTCOME_BUTTONS: { value: Outcome; label: string; bg: string }[] = [
  { value: 'completed',    label: 'Completed',    bg: '#16a34a' },
  { value: 'late',         label: 'Late',         bg: '#ca8a04' },
  { value: 'did_not_duty', label: 'Did Not Duty', bg: '#CC0000' },
]

const actionBtn = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 18px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
})

export default function DutyActions({
  duty,
  profile,
  isAssignee,
  isHead,
  workloadMark,
}: {
  duty: any
  profile: any
  isAssignee: boolean
  isHead: boolean
  workloadMark: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [remarks, setRemarks] = useState(duty.remarks ?? '')
  const [showRevert, setShowRevert] = useState(false)
  const [error, setError] = useState('')

  const status = duty.status
  // Under the merged model, a reviewed duty is one that carries reviewed_by
  // (status stays 'completed'), or a legacy row with status='reviewed'.
  const isReviewed = !!duty.reviewed_by || status === 'reviewed'

  async function updateStatus(
    newStatus: string,
    extra: Record<string, unknown> = {}
  ) {
    setLoading(true)
    setError('')
    const { error: updateError } = await supabase
      .from('duties')
      .update({ status: newStatus, ...extra })
      .eq('id', duty.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
    setShowRevert(false)
  }

  // Marking an outcome IS the review: write the workload mark (source of truth
  // for the matrix) and stamp the duty as reviewed in one action.
  async function markOutcome(outcome: Outcome) {
    if (!duty.assigned_to || !duty.event_id) {
      setError('This duty is missing its member or event, so it cannot be marked.')
      return
    }
    setLoading(true)
    setError('')

    // Server route: writes the workload mark, stamps the duty reviewed
    // (status='completed' + reviewed_by/reviewed_at + remarks) under this
    // user's RLS, AND pushes "your outcome was recorded" to the member
    // in-process — delivery no longer depends on this browser staying open.
    try {
      const res = await fetch('/api/workloads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{ memberId: duty.assigned_to, eventId: duty.event_id, mark: outcome }],
          remarks,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to record the outcome.'); setLoading(false); return }
    } catch {
      setError('Network error — outcome not recorded.')
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  // Consultant-only revert: clears the review stamp on the duty (the workload
  // mark is left intact — re-marking will overwrite it).
  async function revertReview() {
    setLoading(true)
    setError('')
    const { error: updateError } = await supabase
      .from('duties')
      .update({
        status: 'completed',
        reviewed_by: null,
        reviewed_at: null,
        remarks: null,
      })
      .eq('id', duty.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
    setShowRevert(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Member actions (only while not yet reviewed) ── */}
      {isAssignee && !isReviewed && status === 'pending' && (
        <div className="dash-card">
          <p className="section-label" style={{ marginBottom: 4 }}>Start this duty</p>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: '0 0 14px' }}>
            Mark it as in progress when you begin working on it.
          </p>
          <button
            onClick={() => updateStatus('in_progress')}
            disabled={loading}
            style={{ ...actionBtn('#3b82f6'), opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Updating...' : 'Start Duty'}
          </button>
        </div>
      )}

      {isAssignee && !isReviewed && status === 'in_progress' && (
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>Mark as Completed</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
              Submit this duty for review when you&apos;re done.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => updateStatus('completed', { completed_at: new Date().toISOString() })}
              disabled={loading}
              style={{ ...actionBtn('#ca8a04'), opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Updating...' : 'Mark as Completed'}
            </button>
            <button onClick={() => setShowRevert(!showRevert)} className="btn-secondary">
              ↩ Revert to Pending
            </button>
          </div>
          {showRevert && (
            <div style={{
              background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
              padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>Revert this duty back to Pending?</p>
              <button
                onClick={() => updateStatus('pending', { completed_at: null })}
                disabled={loading}
                className="btn-primary"
                style={{ fontSize: '12px', padding: '5px 14px' }}
              >
                {loading ? '...' : 'Yes, Revert'}
              </button>
              <button
                onClick={() => setShowRevert(false)}
                style={{ fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                No
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assignee waiting note — completed but not yet reviewed by a head */}
      {isAssignee && !isHead && !isReviewed && status === 'completed' && (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, padding: '18px 22px' }}>
          <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#a16207', margin: 0 }}>Submitted — awaiting review.</p>
          <p style={{ fontSize: '12.5px', color: '#ca8a04', margin: '4px 0 0' }}>A creative head will record the outcome for this duty.</p>
        </div>
      )}

      {/* ── Head: Mark Outcome (the review step) ── */}
      {isHead && !isReviewed && (
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>Mark Outcome</p>
            <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
              Recording an outcome sets the member&apos;s workload mark and marks this duty reviewed.
            </p>
          </div>

          <div>
            <label className="obra-label">
              Remarks <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Leave feedback or notes for this member..."
              rows={3}
              className="obra-input"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {OUTCOME_BUTTONS.map(b => (
              <button
                key={b.value}
                onClick={() => markOutcome(b.value)}
                disabled={loading}
                style={{ ...actionBtn(b.bg), opacity: loading ? 0.5 : 1 }}
                className="hover:opacity-90 transition"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reviewed — locked panel with recorded outcome ── */}
      {isReviewed && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#15803d', margin: 0 }}>Outcome recorded:</p>
            <WorkloadBadge mark={workloadMark} />
          </div>
          {duty.reviewer?.full_name && (
            <p style={{ fontSize: '12.5px', color: '#16a34a', margin: 0 }}>Reviewed by {duty.reviewer.full_name}</p>
          )}
          {duty.remarks && (
            <div style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 3px' }}>Reviewer note</p>
              <p style={{ fontSize: '13.5px', color: '#333', margin: 0, whiteSpace: 'pre-wrap' }}>{duty.remarks}</p>
            </div>
          )}

          {/* Consultant-only revert */}
          {profile.system_role === 'consultant' && (
            <>
              <button
                onClick={() => setShowRevert(!showRevert)}
                style={{ fontSize: '12.5px', color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
              >
                ↩ Revert review
              </button>
              {showRevert && (
                <div style={{
                  background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                  padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>Clear this review? The workload mark stays unless re-marked.</p>
                  <button onClick={revertReview} disabled={loading} className="btn-primary" style={{ fontSize: '12px', padding: '5px 14px' }}>
                    {loading ? '...' : 'Yes, Revert'}
                  </button>
                  <button
                    onClick={() => setShowRevert(false)}
                    style={{ fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>}
    </div>
  )
}
