'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { X, ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import {
  stepsForRole,
  readTourState,
  writeTourState,
  registerVisit,
  type TourRole,
  type TourStep,
} from '@/lib/tour'

// Spotlight guided tour. Mounted once in the dashboard layout; persists across
// in-app navigations because the layout doesn't remount. Dims the screen with
// an SVG cutout around a real UI element (data-tour anchors), docks a card near
// it (bottom sheet on mobile), and drives Back / Next / Skip. Auto-launches on
// the first visit-days (see lib/tour) and can be replayed from Profile via the
// `obra:tour-start` window event.

const MOBILE_Q = '(max-width: 767px)'
const RING_PAD = 6
const CARD_W = 360

export default function GuidedTour({ role }: { role: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const steps = useMemo(() => stepsForRole(role as TourRole), [role])

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  // Live viewport size — drives centering + clamping, so a resize/rotation or
  // the mobile URL bar collapsing repositions the card instead of clipping it.
  const [vp, setVp] = useState<{ w: number; h: number }>(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 0, h: 0 },
  )

  const step: TourStep | undefined = steps[index]

  // Portal target only exists after mount (avoids SSR/hydration mismatch).
  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia(MOBILE_Q)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Auto-launch on qualifying visit-days; also listen for manual replay.
  useEffect(() => {
    if (steps.length === 0) return
    const { state, shouldAutoLaunch } = registerVisit(readTourState())
    writeTourState(state)
    if (shouldAutoLaunch) {
      setIndex(0)
      setOpen(true)
    }
    const replay = () => {
      setIndex(0)
      setOpen(true)
    }
    window.addEventListener('obra:tour-start', replay)
    return () => window.removeEventListener('obra:tour-start', replay)
  }, [steps.length])

  const close = useCallback(() => {
    setOpen(false)
    setRect(null)
    window.dispatchEvent(new CustomEvent('obra:drawer', { detail: false }))
    document.body.style.overflow = ''
  }, [])

  const finish = useCallback(() => {
    writeTourState({ ...readTourState(), completed: true })
    close()
  }, [close])

  const dontShowAgain = useCallback(() => {
    writeTourState({ ...readTourState(), dismissed: true })
    close()
  }, [close])

  const next = useCallback(() => {
    if (index >= steps.length - 1) {
      finish()
      return
    }
    setRect(null)
    setIndex(i => i + 1)
  }, [index, steps.length, finish])

  const back = useCallback(() => {
    if (index === 0) return
    setRect(null)
    setIndex(i => i - 1)
  }, [index])

  // Lock background scroll while the tour drives its own scrollIntoView.
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Locate (and, if needed, navigate to) the current step's target.
  useEffect(() => {
    if (!open || !step) return
    if (step.type !== 'spotlight' || !step.selector) {
      setRect(null)
      return
    }
    if (step.route && pathname !== step.route) {
      router.push(step.route)
      return // re-runs when pathname updates, then finds the element
    }

    let cancelled = false
    const wantDrawer = isMobile && step.openDrawerOnMobile
    if (wantDrawer) {
      window.dispatchEvent(new CustomEvent('obra:drawer', { detail: true }))
    }

    const started = Date.now()
    const locate = () => {
      if (cancelled) return
      const el = document.querySelector(step.selector!) as HTMLElement | null
      if (el && el.offsetParent !== null) {
        // Temporarily allow scroll so the target can be centered.
        document.body.style.overflow = ''
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
        document.body.style.overflow = 'hidden'
        requestAnimationFrame(() => {
          if (!cancelled) setRect(el.getBoundingClientRect())
        })
        return
      }
      if (Date.now() - started < 6000) setTimeout(locate, 90)
    }
    // Give the drawer animation (or a fresh route) a beat to settle first.
    const kick = setTimeout(locate, wantDrawer ? 340 : step.route && pathname === step.route ? 60 : 0)

    return () => {
      cancelled = true
      clearTimeout(kick)
      if (wantDrawer) {
        window.dispatchEvent(new CustomEvent('obra:drawer', { detail: false }))
      }
    }
  }, [open, index, pathname, isMobile, step, router])

  // Keep the cutout + viewport aligned if the layout shifts. rAF-throttled so a
  // burst of scroll/resize events collapses to one measurement per frame (no
  // getBoundingClientRect thrash), and listeners are passive.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setVp({ w: window.innerWidth, h: window.innerHeight })
        if (step?.selector) {
          const el = document.querySelector(step.selector) as HTMLElement | null
          if (el) setRect(el.getBoundingClientRect())
        }
      })
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { capture: true, passive: true })
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, { capture: true } as EventListenerOptions)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [open, index, step])

  // Keyboard shortcuts.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, back])

  if (!mounted || !open || !step) return null

  const isCentered = step.type !== 'spotlight' || !rect

  // ── Card placement (spotlight steps only; centered steps use a flex layer) ──
  // Every variant caps its height to the viewport and scrolls inside, so the
  // card can never be clipped on short screens.
  let spotlightPos: React.CSSProperties = {}
  if (!isCentered && rect) {
    if (isMobile) {
      // Dock to the side of the screen the target ISN'T on, so the card never
      // covers the element it's pointing at.
      const dockTop = rect.top + rect.height / 2 > vp.h * 0.5
      spotlightPos = {
        position: 'fixed', left: 12, right: 12,
        maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto',
        ...(dockTop ? { top: 12 } : { bottom: 12 }),
      }
    } else {
      const gap = 14
      const w = Math.min(CARD_W, vp.w - 32)
      const left = Math.min(
        Math.max(16, rect.left + rect.width / 2 - w / 2),
        Math.max(16, vp.w - w - 16),
      )
      const belowTop = rect.bottom + gap
      const placeBelow = belowTop + 200 < vp.h
      spotlightPos = placeBelow
        ? { position: 'fixed', top: belowTop, left, width: w, maxHeight: vp.h - belowTop - 16, overflowY: 'auto' }
        : { position: 'fixed', bottom: vp.h - rect.top + gap, left, width: w, maxHeight: rect.top - gap - 16, overflowY: 'auto' }
    }
  }

  const spotlightRing =
    !isCentered && rect ? (
      <div
        style={{
          position: 'fixed',
          left: rect.left - RING_PAD,
          top: rect.top - RING_PAD,
          width: rect.width + RING_PAD * 2,
          height: rect.height + RING_PAD * 2,
          borderRadius: 12,
          boxShadow: '0 0 0 2px #CC0000, 0 8px 30px rgba(0,0,0,0.28)',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    ) : null

  // Card contents, shared by both layouts (centered flex wrapper vs spotlight).
  const cardInner = (
    <>
      {/* Top row: kicker + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'DM Mono', monospace", fontSize: 10.5, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CC0000',
          }}
        >
          <Sparkles size={12} /> Walkthrough
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Close tour"
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 7, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#6b7280', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={15} />
        </button>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.3px', margin: '0 0 6px' }}>
        {step.title}
      </h2>
      <p style={{ fontSize: 13.5, color: '#555', lineHeight: 1.55, margin: 0 }}>
        {step.body}
      </p>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '16px 0 14px', flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <span
            key={s.id}
            style={{
              width: i === index ? 18 : 6, height: 6, borderRadius: 99,
              background: i === index ? '#CC0000' : i < index ? 'rgba(204,0,0,0.35)' : 'rgba(0,0,0,0.12)',
              transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          {step.type === 'welcome' ? (
            <button type="button" onClick={dontShowAgain}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Don’t show again
            </button>
          ) : step.type !== 'finish' ? (
            <button type="button" onClick={close}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12.5, cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Skip tour
            </button>
          ) : <span />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {index > 0 && step.type !== 'finish' && (
            <button type="button" onClick={back} className="btn-secondary" style={{ padding: '7px 12px' }}>
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {step.type === 'finish' ? (
            <button type="button" onClick={finish} className="btn-primary" style={{ padding: '8px 18px' }}>
              <Check size={15} /> Done
            </button>
          ) : step.type === 'welcome' ? (
            <button type="button" onClick={next} className="btn-primary" style={{ padding: '8px 18px' }}>
              Start tour <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-primary" style={{ padding: '8px 16px' }}>
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guided tour"
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
    >
      {/* Dim layer: SVG cutout for spotlight steps, flat dim for centered cards.
          Percentage sizing tracks the fixed inset:0 parent, so no vw/vh math. */}
      {isCentered ? (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,13,13,0.62)' }} />
      ) : (
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="obra-tour-hole">
              <rect x={0} y={0} width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - RING_PAD}
                  y={rect.top - RING_PAD}
                  width={rect.width + RING_PAD * 2}
                  height={rect.height + RING_PAD * 2}
                  rx={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect x={0} y={0} width="100%" height="100%" fill="rgba(13,13,13,0.60)" mask="url(#obra-tour-hole)" />
        </svg>
      )}

      {spotlightRing}

      {/* Card. Centered steps use a flex layer (NO transform, so it can't fight
          the push-banner-in entrance animation's transform); spotlight steps
          use the clamped spotlightPos. Both cap height + scroll internally. */}
      {isCentered ? (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2, padding: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            className="push-banner-in"
            style={{
              pointerEvents: 'auto', boxSizing: 'border-box',
              width: 'min(380px, 100%)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
              background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.28)', padding: 20,
            }}
          >
            {cardInner}
          </div>
        </div>
      ) : (
        <div
          className="push-banner-in"
          style={{
            ...spotlightPos, zIndex: 2, boxSizing: 'border-box',
            background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.28)', padding: 20,
          }}
        >
          {cardInner}
        </div>
      )}
    </div>,
    document.body,
  )
}
