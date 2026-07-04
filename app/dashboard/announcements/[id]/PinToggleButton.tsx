'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PinOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Pin/unpin an announcement (poster or consultant — the existing announcements
// UPDATE policy governs). Pinned posts render in their own section at the top
// of the list. Requires db/2026-announcements-pinned.sql.
export default function PinToggleButton({
  announcementId,
  pinned,
}: {
  announcementId: string
  pinned: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ pinned: !pinned })
      .eq('id', announcementId)
    setLoading(false)
    if (updateError) {
      setError(
        /column|pinned/i.test(updateError.message)
          ? 'Pinning needs the db/2026-announcements-pinned.sql migration.'
          : updateError.message,
      )
      return
    }
    router.refresh()
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="btn-secondary"
        disabled={loading}
        onClick={toggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}
      >
        {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        {pinned ? 'Unpin' : 'Pin to top'}
      </button>
      {error && <span style={{ fontSize: 12, color: '#CC0000' }}>{error}</span>}
    </span>
  )
}
