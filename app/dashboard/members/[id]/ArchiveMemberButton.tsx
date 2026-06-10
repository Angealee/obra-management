'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore } from 'lucide-react'

type Props = {
  memberId: string
  currentStatus: string
  memberName: string
}

export default function ArchiveMemberButton({ memberId, currentStatus, memberName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isArchived = currentStatus === 'archived'
  const action = isArchived ? 'unarchive' : 'archive'

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/members/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    router.push('/dashboard/members')
    router.refresh()
  }

  if (showConfirm) {
    return (
      <div style={{
        background: isArchived ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${isArchived ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#333', margin: 0 }}>
          {isArchived
            ? <>Restore <strong>{memberName}</strong> to active status?</>
            : <>Archive <strong>{memberName}</strong>? They will be hidden from the members list but no data will be deleted.</>
          }
        </p>
        {error && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#dc2626', margin: 0 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={isArchived ? 'btn-primary' : 'btn-danger'}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : isArchived ? 'Yes, Restore' : 'Yes, Archive'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={isArchived ? 'btn-secondary' : 'btn-danger'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {isArchived
        ? <><ArchiveRestore size={14} /> Restore Member</>
        : <><Archive size={14} /> Archive Member</>
      }
    </button>
  )
}