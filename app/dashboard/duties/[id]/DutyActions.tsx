'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WorkloadBadge from '@/components/WorkLoadBadge'

type Outcome = 'completed' | 'late' | 'did_not_duty'

const OUTCOME_BUTTONS: { value: Outcome; label: string; bg: string; hover: string }[] = [
  { value: 'completed',    label: '✓ Completed',    bg: '#16a34a', hover: '#15803d' },
  { value: 'late',         label: '⏰ Late',         bg: '#ca8a04', hover: '#a16207' },
  { value: 'did_not_duty', label: '✗ Did Not Duty', bg: '#CC0000', hover: '#a30000' },
]

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
    <div className="space-y-4">

      {/* ── Member actions (only while not yet reviewed) ── */}
      {isAssignee && !isReviewed && status === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Start this duty</h2>
          <p className="text-gray-400 text-xs mb-4">Mark it as in progress when you begin working on it.</p>
          <button
            onClick={() => updateStatus('in_progress')}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Start Duty'}
          </button>
        </div>
      )}

      {isAssignee && !isReviewed && status === 'in_progress' && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Mark as Completed</h2>
          <p className="text-gray-400 text-xs mb-2">
            Submit this duty for review when you&apos;re done with all tasks.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => updateStatus('completed', { completed_at: new Date().toISOString() })}
              disabled={loading}
              className="bg-yellow-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Mark as Completed'}
            </button>
            <button
              onClick={() => setShowRevert(!showRevert)}
              className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition"
            >
              ↩ Revert to Pending
            </button>
          </div>
          {showRevert && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
              <p className="text-sm text-gray-600">Revert this duty back to Pending?</p>
              <button onClick={() => updateStatus('pending', { completed_at: null })} disabled={loading}
                className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                {loading ? '...' : 'Yes, Revert'}
              </button>
              <button onClick={() => setShowRevert(false)} className="text-sm text-gray-500">No</button>
            </div>
          )}
        </div>
      )}

      {/* Assignee waiting note — completed but not yet reviewed by a head */}
      {isAssignee && !isHead && !isReviewed && status === 'completed' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6">
          <p className="text-yellow-700 text-sm font-medium">⏳ Submitted — awaiting review.</p>
          <p className="text-yellow-600 text-xs mt-1">A creative head will record the outcome for this duty.</p>
        </div>
      )}

      {/* ── Head: Mark Outcome (the review step) ── */}
      {isHead && !isReviewed && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-1">Mark Outcome</h2>
            <p className="text-gray-400 text-xs">
              Record how this duty turned out. This sets the member&apos;s workload mark for the
              event and marks the duty as reviewed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Leave feedback or notes for this member..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            />
          </div>

          <div className="flex gap-3 flex-wrap">
            {OUTCOME_BUTTONS.map(b => (
              <button
                key={b.value}
                onClick={() => markOutcome(b.value)}
                disabled={loading}
                style={{ background: b.bg }}
                className="text-white px-5 py-2 rounded-lg text-sm transition disabled:opacity-50 hover:opacity-90"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reviewed — locked panel with recorded outcome ── */}
      {isReviewed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-green-700 text-sm font-medium">Outcome recorded:</p>
            <WorkloadBadge mark={workloadMark} />
          </div>
          {(duty as any).reviewer?.full_name && (
            <p className="text-green-600 text-xs">Reviewed by {(duty as any).reviewer.full_name}</p>
          )}
          {duty.remarks && (
            <p className="text-sm text-gray-700 bg-white border border-green-100 rounded-lg p-3">
              <span className="text-xs text-gray-400 block mb-1">Reviewer note</span>
              {duty.remarks}
            </p>
          )}

          {/* Consultant-only revert */}
          {profile.system_role === 'consultant' && (
            <>
              <button
                onClick={() => setShowRevert(!showRevert)}
                className="text-xs text-gray-400 hover:text-gray-600 underline transition"
              >
                ↩ Revert review
              </button>
              {showRevert && (
                <div className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
                  <p className="text-sm text-gray-600">Clear this review? The workload mark stays unless re-marked.</p>
                  <button onClick={revertReview} disabled={loading}
                    className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                    {loading ? '...' : 'Yes, Revert'}
                  </button>
                  <button onClick={() => setShowRevert(false)} className="text-sm text-gray-500">No</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
