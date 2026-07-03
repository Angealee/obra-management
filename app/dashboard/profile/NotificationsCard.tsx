'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, CheckCircle2, Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Push-notification controls: enable/disable this device, per-category
// preferences (stored on ALL of the user's subscription rows so they follow
// the person across devices), and the TEMPORARY test button.
//
// Platform truths surfaced honestly: unsupported browsers and iOS-not-
// installed get an explanation instead of a broken toggle, and in dev the
// service worker isn't registered (production-only), so we say so.

type PushState =
  | 'checking'
  | 'unsupported'   // browser has no Push API
  | 'ios-install'   // iOS Safari tab — must be installed to Home Screen first
  | 'no-sw'         // no service worker registration (dev build)
  | 'denied'        // permission permanently denied in browser settings
  | 'off'           // supported, not subscribed
  | 'on'            // subscribed on this device

const CATEGORY_META: { key: string; label: string; adminOnly?: boolean }[] = [
  { key: 'announcements', label: 'Announcements' },
  { key: 'duties',        label: 'Duty assignments' },
  { key: 'events',        label: 'New events' },
  { key: 'workload',      label: 'Duty outcomes / reviews' },
  { key: 'applications',  label: 'New applications', adminOnly: true },
]

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export default function NotificationsCard({
  profileId,
  isConsultant,
}: {
  profileId: string
  isConsultant: boolean
}) {
  const supabase = createClient()

  const [state, setState] = useState<PushState>('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Record<string, boolean>>({})
  const [testStatus, setTestStatus] = useState<string | null>(null)

  useEffect(() => {
    async function detect() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        const ua = navigator.userAgent
        const isIos = /iphone|ipad|ipod/i.test(ua)
        const standalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true
        setState(isIos && !standalone ? 'ios-install' : 'unsupported')
        return
      }
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) { setState('no-sw'); return }
      if (Notification.permission === 'denied') { setState('denied'); return }
      const sub = await reg.pushManager.getSubscription()
      setState(sub ? 'on' : 'off')

      // Load saved category prefs (any of the user's rows carries them).
      const { data } = await supabase
        .from('push_subscriptions')
        .select('categories')
        .eq('profile_id', profileId)
        .limit(1)
        .maybeSingle()
      if (data?.categories) setCategories(data.categories)
    }
    void detect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) { setState('no-sw'); return }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) { setError('Push keys are not configured on this deployment.'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      })
      const json = sub.toJSON()
      const { error: saveError } = await supabase.from('push_subscriptions').upsert(
        {
          profile_id: profileId,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          user_agent: navigator.userAgent.slice(0, 300),
          // A new device inherits the prefs already saved on the user's other
          // devices; without this it would start from the all-on defaults and
          // drift until the next toggle.
          ...(Object.keys(categories).length > 0 ? { categories } : {}),
        },
        { onConflict: 'endpoint' },
      )
      if (saveError) {
        await sub.unsubscribe()
        setError('Could not save this device — run db/2026-push-subscriptions.sql if this persists.')
        return
      }
      setState('on')
    } catch {
      setError('Could not enable notifications on this device.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setError('Could not disable notifications.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleCategory(key: string) {
    const next = { ...categories, [key]: !(categories[key] ?? true) }
    setCategories(next)
    // Preferences follow the person: update every device row at once.
    await supabase.from('push_subscriptions').update({ categories: next }).eq('profile_id', profileId)
  }

  async function sendTest() {
    setTestStatus('Sending in ~4 seconds — background or close the app NOW to prove closed-app delivery…')
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test' }),
      })
      const data = await res.json()
      setTestStatus(
        res.ok
          ? `Delivered to ${data.sent} device${data.sent !== 1 ? 's' : ''}${data.pruned ? ` (${data.pruned} dead subscription pruned)` : ''}.`
          : data.error ?? 'Test failed.',
      )
    } catch {
      setTestStatus('Network error — test not sent.')
    }
  }

  const visibleCategories = CATEGORY_META.filter(c => !c.adminOnly || isConsultant)

  return (
    <div className="dash-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Bell size={16} style={{ color: '#CC0000' }} />
        <p className="section-label" style={{ margin: 0 }}>Push Notifications</p>
      </div>
      <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.6 }}>
        Get notified about announcements, duty assignments, new events, and duty outcomes —
        even when the app is closed. On iPhone, install the app to your Home Screen first (iOS 16.4+).
      </p>

      {state === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: '#6b7280' }} />}

      {state === 'unsupported' && (
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          This browser doesn&apos;t support push notifications.
        </p>
      )}

      {state === 'ios-install' && (
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          On iPhone, push works only from the installed app: tap <strong>Share → Add to Home Screen</strong>,
          then open Obra from the Home Screen and enable notifications here.
        </p>
      )}

      {state === 'no-sw' && (
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          Notifications activate on the production build (the service worker doesn&apos;t register in dev).
          Use the deployed app, or locally: <code style={{ fontFamily: "'DM Mono', monospace" }}>npm run build &amp;&amp; npm start</code>.
        </p>
      )}

      {state === 'denied' && (
        <p style={{ fontSize: 13, color: '#b45309', margin: 0 }}>
          Notifications are blocked in your browser settings for this site. Re-allow them there,
          then reload this page.
        </p>
      )}

      {(state === 'off' || state === 'on') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {state === 'off' ? (
              <button type="button" className="btn-primary" disabled={busy} onClick={enable}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.7 : 1 }}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                Enable on this device
              </button>
            ) : (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Enabled on this device
                </span>
                <button type="button" className="btn-secondary" disabled={busy} onClick={disable}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: busy ? 0.7 : 1 }}>
                  <BellOff size={13} /> Disable
                </button>
              </>
            )}
          </div>

          {/* Per-category preferences (apply to all of this user's devices) */}
          {state === 'on' && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                What to notify me about
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleCategories.map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#333', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={categories[c.key] ?? true}
                      onChange={() => toggleCategory(c.key)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── TEMPORARY: remove this block once push is proven in production ── */}
          {state === 'on' && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgba(204,0,0,0.25)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#CC0000', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                Temporary — verification tool
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={sendTest}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Send size={13} /> Send test (4s delay)
                </button>
                {testStatus && <span style={{ fontSize: 12.5, color: '#6b7280' }}>{testStatus}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p style={{ fontSize: 12.5, color: '#CC0000', margin: '10px 0 0' }}>{error}</p>}
    </div>
  )
}
