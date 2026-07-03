'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// The audience member's side of read receipts: opening the page records
// "seen" automatically (fire-and-forget insert of the member's OWN row —
// RLS forbids writing anyone else's), and the Acknowledge button stamps
// acknowledged_at. Admin counts live in the server-rendered stats card.
export default function AnnouncementReceipt({
  announcementId,
  profileId,
  initialSeen,
  initialAcknowledgedAt,
}: {
  announcementId: string
  profileId: string
  initialSeen: boolean
  initialAcknowledgedAt: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(initialAcknowledgedAt)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seenRecorded = useRef(initialSeen)

  // Auto-record "seen" on first open. ignoreDuplicates keeps an existing row
  // (and its acknowledged_at) untouched on revisits.
  useEffect(() => {
    if (seenRecorded.current) return
    seenRecorded.current = true
    void supabase
      .from('announcement_reads')
      .upsert(
        { announcement_id: announcementId, profile_id: profileId },
        { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true },
      )
      .then(() => {}) // best-effort — a failed receipt never blocks reading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function acknowledge() {
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()
    const { error: upsertError } = await supabase
      .from('announcement_reads')
      .upsert(
        { announcement_id: announcementId, profile_id: profileId, acknowledged_at: now },
        { onConflict: 'announcement_id,profile_id' },
      )
    setSaving(false)
    if (upsertError) {
      setError('Could not record your acknowledgment. Please try again.')
      return
    }
    setAcknowledgedAt(now)
    router.refresh()
  }

  if (acknowledgedAt) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '12px 16px', marginBottom: 14,
      }}>
        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
          Acknowledged on {new Date(acknowledgedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10,
      padding: '12px 16px', marginBottom: 14,
    }}>
      <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
        Please confirm you&apos;ve read this announcement.
        {error && <span style={{ color: '#CC0000', display: 'block', marginTop: 4, fontSize: 12.5 }}>{error}</span>}
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={saving}
        onClick={acknowledge}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
        Acknowledge
      </button>
    </div>
  )
}
