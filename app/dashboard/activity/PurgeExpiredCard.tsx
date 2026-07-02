'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

// "Data hygiene" control for the retention policy: rejected/withdrawn
// applications older than one year past their decision. Two explicit steps —
// check the count first, then a separate confirmed delete — so nothing is
// ever removed silently. The purge itself appears in the feed above.
export default function PurgeExpiredCard() {
  const router = useRouter()
  const [count, setCount] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [purging, setPurging] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    setChecking(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/applications/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'count' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not check for expired applications.'); return }
      setCount(data.count)
      if (data.count === 0) setMessage('No expired applications — the retention policy is satisfied.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  async function purge() {
    if (count == null || count === 0) return
    const confirmed = window.confirm(
      `Permanently delete ${count} expired application${count !== 1 ? 's' : ''}? ` +
      'These are rejected or withdrawn applications decided more than a year ago. This cannot be undone.'
    )
    if (!confirmed) return

    setPurging(true)
    setError(null)
    try {
      const res = await fetch('/api/applications/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'purge' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Purge failed.'); return }
      setMessage(`Deleted ${data.purged} expired application${data.purged !== 1 ? 's' : ''}. The purge is recorded in the feed above.`)
      setCount(null)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="dash-card" style={{ padding: '18px 22px', marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="section-label" style={{ marginBottom: '5px' }}>Data Hygiene</p>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>
            Per the privacy notice on the application form, rejected and withdrawn applications
            are deleted one year after their decision.
          </p>
          {message && <p style={{ fontSize: '12.5px', color: '#16a34a', marginTop: '8px' }}>{message}</p>}
          {error && <p style={{ fontSize: '12.5px', color: '#CC0000', marginTop: '8px' }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {count != null && count > 0 ? (
            <>
              <span style={{ fontSize: '12.5px', color: '#666' }}>
                <strong style={{ color: '#CC0000' }}>{count}</strong> qualif{count !== 1 ? 'y' : 'ies'} for deletion
              </span>
              <button
                type="button"
                onClick={purge}
                disabled={purging}
                className="btn-danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: purging ? 0.7 : 1 }}
              >
                <Trash2 size={13} />
                {purging ? 'Deleting…' : `Delete ${count}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={check}
              disabled={checking}
              className="btn-secondary"
              style={{ opacity: checking ? 0.7 : 1 }}
            >
              {checking ? 'Checking…' : 'Check for expired applications'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
