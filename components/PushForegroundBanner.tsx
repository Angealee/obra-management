'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X } from 'lucide-react'

// In-app notification banners for pushes that arrive while the app is OPEN.
// The service worker detects a visible window, skips the OS notification, and
// posts { kind: 'PUSH_RECEIVED', payload } here instead (public/sw.js).
//
// Behavior: banners stack from the top (newest first, max 3 on screen),
// auto-dismiss after 7s, tap navigates to the payload's deep link. The look
// deliberately mirrors the sidebar's dark editorial chrome — this is the
// app speaking, not a browser artifact.

type Banner = {
  id: number
  title: string
  body: string
  url: string
}

const AUTO_DISMISS_MS = 7000
const MAX_VISIBLE = 3

export default function PushForegroundBanner() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function onMessage(event: MessageEvent) {
      const data = event.data
      if (!data || data.kind !== 'PUSH_RECEIVED' || !data.payload) return
      const id = nextId.current++
      const banner: Banner = {
        id,
        title: String(data.payload.title ?? 'Obra CMP'),
        body: String(data.payload.body ?? ''),
        url: String(data.payload.url ?? '/dashboard'),
      }
      setBanners(prev => [banner, ...prev].slice(0, MAX_VISIBLE))
      window.setTimeout(() => {
        setBanners(prev => prev.filter(b => b.id !== id))
      }, AUTO_DISMISS_MS)
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  function open(banner: Banner) {
    setBanners(prev => prev.filter(b => b.id !== banner.id))
    router.push(banner.url)
    router.refresh()
  }

  function dismiss(id: number) {
    setBanners(prev => prev.filter(b => b.id !== id))
  }

  if (banners.length === 0) return null

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 'calc(100vw - 24px)',
        maxWidth: 420,
      }}
    >
      {banners.map(banner => (
        <div
          key={banner.id}
          className="push-banner-in"
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: '#0D0D0D',
            borderLeft: '3px solid #CC0000',
            borderRadius: 12,
            padding: '12px 12px 12px 14px',
            boxShadow: '0 10px 32px rgba(0,0,0,0.32)',
            cursor: 'pointer',
          }}
          onClick={() => open(banner)}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'rgba(204,0,0,0.18)', color: '#ff6b6b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={15} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 700,
              color: '#fff', margin: 0, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {banner.title}
            </p>
            {banner.body && (
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                color: 'rgba(255,255,255,0.65)', margin: '3px 0 0', lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>
                {banner.body}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={e => { e.stopPropagation(); dismiss(banner.id) }}
            style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.12)', background: 'transparent',
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
