'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DutyRowActions({
  dutyId,
  canManage,
}: {
  dutyId: string
  canManage: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('duties').delete().eq('id', dutyId)
    router.refresh()
  }

  if (!canManage) {
    return (
      <Link
        href={`/dashboard/duties/${dutyId}`}
        style={{ fontSize: '12px', color: '#bbb', textDecoration: 'none' }}
        className="hover:text-gray-700 transition-colors"
      >
        View →
      </Link>
    )
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11.5px', color: '#CC0000', fontWeight: 500 }}>Remove?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ fontSize: '11.5px', color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
        >
          {deleting ? '...' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ fontSize: '11.5px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Link
        href={`/dashboard/duties/${dutyId}`}
        style={{ fontSize: '12px', color: '#bbb', textDecoration: 'none' }}
        className="hover:text-gray-700 transition-colors"
      >
        View
      </Link>
      <button
        onClick={() => setConfirming(true)}
        style={{ fontSize: '12px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        className="hover:text-red-500 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}