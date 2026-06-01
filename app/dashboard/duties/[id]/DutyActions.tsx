'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DutyActions({
  duty,
  profile,
  isAssignee,
  isHead,
}: {
  duty: any
  profile: any
  isAssignee: boolean
  isHead: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [showRevert, setShowRevert] = useState(false)
  const [error, setError] = useState('')

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
    setShowReview(false)
    setShowRevert(false)
  }

  const status = duty.status

  return (
    <div className="space-y-4">

      {/* ── Member actions ── */}
      {isAssignee && status === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
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

      {isAssignee && status === 'in_progress' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Mark as Completed</h2>
          <p className="text-gray-400 text-xs mb-2">
            Submit this duty for review when you're done with all tasks.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus('completed', { completed_at: new Date().toISOString() })}
              disabled={loading}
              className="bg-yellow-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Mark as Completed'}
            </button>
            {/* Revert to pending */}
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

      {/* ── Head review actions ── */}
      {isHead && status === 'completed' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 mb-1">Review Duty</h2>
          <p className="text-gray-400 text-xs">
            Review and mark this duty as done, or send it back to the member.
          </p>

          {!showReview ? (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowReview(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 transition"
              >
                Review & Approve
              </button>
              <button
                onClick={() => setShowRevert(!showRevert)}
                className="px-6 py-2 rounded-lg text-sm border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition"
              >
                ↩ Send Back to In Progress
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus('reviewed', {
                    reviewed_by: profile.id,
                    reviewed_at: new Date().toISOString(),
                    remarks: remarks.trim() || null,
                  })}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Confirm Review'}
                </button>
                <button onClick={() => setShowReview(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showRevert && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
              <p className="text-sm text-gray-600">Send this duty back to In Progress?</p>
              <button onClick={() => updateStatus('in_progress', { completed_at: null })} disabled={loading}
                className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                {loading ? '...' : 'Yes'}
              </button>
              <button onClick={() => setShowRevert(false)} className="text-sm text-gray-500">No</button>
            </div>
          )}
        </div>
      )}

      {/* Reviewed — locked */}
      {status === 'reviewed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <p className="text-green-700 text-sm font-medium">✓ This duty has been reviewed and approved.</p>
          {duty.remarks && (
            <p className="text-green-600 text-xs mt-1">Reviewer note: {duty.remarks}</p>
          )}
          {/* Head can still revert reviewed duty */}
          {isHead && (
            <button
              onClick={() => setShowRevert(!showRevert)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline transition"
            >
              ↩ Revert to Completed
            </button>
          )}
          {isHead && showRevert && (
            <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-center flex-wrap">
              <p className="text-sm text-gray-600">Revert this duty back to Completed?</p>
              <button onClick={() => updateStatus('completed', { reviewed_by: null, reviewed_at: null, remarks: null })}
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50">
                {loading ? '...' : 'Yes, Revert'}
              </button>
              <button onClick={() => setShowRevert(false)} className="text-sm text-gray-500">No</button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}