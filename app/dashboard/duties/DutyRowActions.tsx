'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Play, Eye, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Row-level actions on the duties board. Designed as real touch targets
// (bordered buttons, generous padding) so they don't misfire on mobile.
//   • Assignees get one-tap status advancement (Start → Done).
//   • Everyone gets View; managers also get Remove (inline confirm).
export default function DutyRowActions({
  dutyId,
  canManage,
  isAssignee = false,
  status = '',
  isReviewed = false,
  viewHref,
}: {
  dutyId: string
  canManage: boolean
  isAssignee?: boolean
  status?: string
  isReviewed?: boolean
  /** Override the View link target (hub rows point at ?duty= slide-over URLs). */
  viewHref?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function advance(next: 'in_progress' | 'completed') {
    setBusy(true)
    const extra = next === 'completed' ? { completed_at: new Date().toISOString() } : {}
    await supabase.from('duties').update({ status: next, ...extra }).eq('id', dutyId)
    router.refresh()
    setBusy(false)
  }

  async function handleDelete() {
    setBusy(true)
    await supabase.from('duties').delete().eq('id', dutyId)
    router.refresh()
  }

  // Quick status advancement for the person the duty belongs to.
  const quickAction =
    isAssignee && !isReviewed && (status === 'pending' || status === 'in_progress') ? (
      <button
        onClick={() => advance(status === 'pending' ? 'in_progress' : 'completed')}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: '12.5px', fontWeight: 600,
          padding: '8px 14px', borderRadius: 9, border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          background: status === 'pending' ? '#eff6ff' : '#f0fdf4',
          color: status === 'pending' ? '#1d4ed8' : '#15803d',
          opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {busy
          ? '…'
          : status === 'pending'
            ? (<><Play size={13} strokeWidth={2.5} /> Start</>)
            : (<><Check size={14} strokeWidth={2.5} /> Done</>)}
      </button>
    ) : null

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '12.5px', color: '#CC0000', fontWeight: 500 }}>Remove?</span>
        <button
          onClick={handleDelete}
          disabled={busy}
          style={{
            fontSize: '12.5px', fontWeight: 600, color: '#fff', background: '#CC0000',
            border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
          }}
        >
          {busy ? '...' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            fontSize: '12.5px', fontWeight: 500, color: '#555', background: '#fff',
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
          }}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      {quickAction}
      <Link
        href={viewHref ?? `/dashboard/duties/${dutyId}`}
        className="duty-action-btn"
        aria-label="View duty"
      >
        <Eye size={14} strokeWidth={2} />
        <span>View</span>
      </Link>
      {canManage && (
        <button
          onClick={() => setConfirming(true)}
          className="duty-action-btn duty-action-danger"
          aria-label="Remove duty"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
