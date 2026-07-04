'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Row-level actions on the duties list.
//   • Assignees get one-tap status advancement (Start → Done) right on the
//     row — the most common action in the app no longer requires opening the
//     detail page. The detail page remains for checklists/remarks.
//   • Managers keep View / Remove (with inline confirm).
export default function DutyRowActions({
  dutyId,
  canManage,
  isAssignee = false,
  status = '',
  isReviewed = false,
}: {
  dutyId: string
  canManage: boolean
  isAssignee?: boolean
  status?: string
  isReviewed?: boolean
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
          fontSize: '11.5px',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '7px',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          background: status === 'pending' ? '#eff6ff' : '#f0fdf4',
          color: status === 'pending' ? '#1d4ed8' : '#15803d',
          opacity: busy ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy ? '…' : status === 'pending' ? '▸ Start' : '✓ Done'}
      </button>
    ) : null

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11.5px', color: '#CC0000', fontWeight: 500 }}>Remove?</span>
        <button
          onClick={handleDelete}
          disabled={busy}
          style={{ fontSize: '11.5px', color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
        >
          {busy ? '...' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ fontSize: '11.5px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {quickAction}
      <Link
        href={`/dashboard/duties/${dutyId}`}
        style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}
        className="hover:text-gray-700 transition-colors"
      >
        View
      </Link>
      {canManage && (
        <button
          onClick={() => setConfirming(true)}
          style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          className="hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  )
}
