'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

// Right-side detail panel driven by a URL param (?duty=…): the host server
// page decides WHEN to render it and what goes inside; this shell only owns
// the chrome — backdrop, close affordances (X / backdrop / Escape), scroll
// lock, and the full-width-sheet behavior on phones.
export default function SlideOver({
  closeHref,
  fullPageHref,
  children,
}: {
  closeHref: string
  /** Optional "Open full page →" target (the standalone route). */
  fullPageHref?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  const close = useCallback(() => {
    router.replace(closeHref, { scroll: false })
  }, [router, closeHref])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [close])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="slide-over-backdrop"
        onClick={close}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
      />

      {/* Panel — full-width sheet on phones, fixed 480px on desktop */}
      <div
        className="slide-over-panel"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: '#F7F7F5',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Chrome bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          background: '#fff', flexShrink: 0,
        }}>
          {fullPageHref ? (
            <Link
              href={fullPageHref}
              style={{ fontSize: '12.5px', color: '#6b7280', textDecoration: 'none' }}
              className="hover:text-gray-800 transition-colors"
            >
              Open full page →
            </Link>
          ) : <span />}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
              color: '#555', cursor: 'pointer',
            }}
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
