'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw, Share, X } from 'lucide-react'

// Minimal BeforeInstallPromptEvent shape (not in TS DOM lib).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const IOS_HINT_DISMISSED_KEY = 'obra-ios-install-dismissed'

export default function PwaController() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)

  // ── Register the service worker (production only — avoids caching dev chunks
  // and interfering with HMR). Drives the update toast. ──
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting)
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(nw)
          }
        })
      })
    }).catch(() => {/* registration failures are non-fatal */})

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // ── Custom install affordance (Chromium/Android). ──
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // ── iOS add-to-home hint (Safari has no beforeinstallprompt). ──
  useEffect(() => {
    const ua = window.navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari exposes navigator.standalone
      (window.navigator as any).standalone === true
    const dismissed = localStorage.getItem(IOS_HINT_DISMISSED_KEY) === 'true'
    if (isIos && !isStandalone && !dismissed) setShowIosHint(true)
  }, [])

  async function doInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  function applyUpdate() {
    waitingWorker?.postMessage('SKIP_WAITING')
    setWaitingWorker(null)
  }

  function dismissIosHint() {
    localStorage.setItem(IOS_HINT_DISMISSED_KEY, 'true')
    setShowIosHint(false)
  }

  const baseFont = 'DM Sans, sans-serif'

  return (
    <>
      {/* Update-available toast */}
      {waitingWorker && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 'calc(100vw - 24px)',
            background: '#0D0D0D',
            color: '#fff',
            borderRadius: 12,
            padding: '10px 12px 10px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
          }}
        >
          <RefreshCw size={16} style={{ color: '#fff', flexShrink: 0 }} />
          <span style={{ fontFamily: baseFont, fontSize: 13.5, fontWeight: 500 }}>
            A new version is available.
          </span>
          <button
            type="button"
            onClick={applyUpdate}
            style={{
              fontFamily: baseFont, fontSize: 13, fontWeight: 700,
              background: '#CC0000', color: '#fff',
              border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Custom install button (Android/Chromium) */}
      {installPrompt && (
        <button
          type="button"
          onClick={doInstall}
          aria-label="Install Obra app"
          style={{
            position: 'fixed',
            right: 'calc(16px + env(safe-area-inset-right))',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            zIndex: 65,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#CC0000',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '11px 18px',
            fontFamily: baseFont,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 6px 22px rgba(204,0,0,0.35)',
          }}
        >
          <Download size={16} />
          Install app
        </button>
      )}

      {/* iOS add-to-home hint */}
      {showIosHint && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
            zIndex: 65,
            width: 'calc(100vw - 24px)',
            maxWidth: 420,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: '14px 14px 14px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Share size={16} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: baseFont, fontSize: 13.5, fontWeight: 700, color: '#111', margin: '0 0 2px' }}>
              Install Obra on your iPhone
            </p>
            <p style={{ fontFamily: baseFont, fontSize: 12.5, color: '#666', lineHeight: 1.5, margin: 0 }}>
              Tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissIosHint}
            aria-label="Dismiss"
            style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: 7,
              border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
