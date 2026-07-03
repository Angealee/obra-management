'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'

const DISMISSED_KEY = 'obra-push-banner-dismissed'

// One-time discovery banner: shown only when push is supported, the service
// worker is registered (production), permission hasn't been asked yet, and the
// user hasn't dismissed it. Enabling itself happens on the Profile page — the
// permission prompt needs a deliberate user gesture there.
export default function EnablePushBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      if (localStorage.getItem(DISMISSED_KEY) === 'true') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
      if (Notification.permission !== 'default') return
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (!sub) setShow(true)
    }
    void check()
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="no-print"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#0D0D0D', color: '#fff',
        borderRadius: 12, padding: '12px 14px 12px 16px',
        margin: '16px 20px 0',
      }}
    >
      <Bell size={16} style={{ color: '#CC0000', flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
        Never miss a duty or announcement — enable push notifications.
      </p>
      <Link
        href="/dashboard/profile"
        onClick={dismiss}
        style={{
          fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#CC0000',
          borderRadius: 8, padding: '7px 14px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        Enable
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification banner"
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
          color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
