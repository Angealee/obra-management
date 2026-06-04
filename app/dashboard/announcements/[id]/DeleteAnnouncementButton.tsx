'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAnnouncementButton({
  announcementId,
  title,
}: {
  announcementId: string
  title: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    const { error: e } = await supabase
      .from('announcements').delete().eq('id', announcementId)
    if (e) { setError(e.message); setLoading(false); return }
    router.push('/dashboard/announcements')
    router.refresh()
  }

  if (!showConfirm) {
    return (
      <button onClick={() => setShowConfirm(true)} className="btn-danger">
        Delete
      </button>
    )
  }

  return (
    <div style={{ background: '#fff5f5', border: '1px solid #fecdd3', borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <p style={{ fontSize: '13px', color: '#CC0000' }}>Delete "{title}"? This cannot be undone.</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleDelete} disabled={loading} className="btn-danger"
          style={{ opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Deleting...' : 'Yes, Delete'}
        </button>
        <button onClick={() => setShowConfirm(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#CC0000', width: '100%' }}>{error}</p>}
    </div>
  )
}