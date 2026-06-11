'use client'

import { useEffect, useRef } from 'react'

const TOTAL = 35
const DURATION = 4200
const FADE = 600
const DOT_COUNT = 6

interface SlideshowProps {
  /** If true, renders as a fixed-height banner (mobile). If false, fills its container absolutely. */
  variant?: 'banner' | 'panel'
}

export default function Slideshow({ variant = 'panel' }: SlideshowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef      = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function shuffle(arr: number[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }

    let deck   = shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1))
    let cursor = 0
    let current: HTMLImageElement | null = null
    let dotIdx = 0

    // Build dots
    const dots: HTMLDivElement[] = []
    if (dotsRef.current) {
      dotsRef.current.innerHTML = ''
      for (let i = 0; i < DOT_COUNT; i++) {
        const d = document.createElement('div')
        d.style.cssText =
          'height:2px;border-radius:2px;background:rgba(255,255,255,0.25);transition:background 0.4s,width 0.4s;width:18px'
        dotsRef.current.appendChild(d)
        dots.push(d)
      }
    }

    function setActiveDot(idx: number) {
      dots.forEach((d, i) => {
        const active = i === idx % DOT_COUNT
        d.style.background = active ? '#CC0000' : 'rgba(255,255,255,0.25)'
        d.style.width       = active ? '28px' : '18px'
      })
    }

    function next() {
      if (cursor >= deck.length) {
        deck   = shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1))
        cursor = 0
      }
      const idx = deck[cursor++]
      const img = document.createElement('img')
      const container = containerRef.current
        if (!container) return
        const containerEl: HTMLDivElement = container
      img.src   = `/slideshow/Vinculum-${idx}.jpg`
      img.style.cssText =
        `position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
        object-position:center center;
        opacity:0;
        transform:scale(1);
        transition:opacity ${FADE}ms ease, transform ${DURATION + FADE}ms linear;`
      containerEl.appendChild(img)

      img.onload  = () => {
        requestAnimationFrame(() => {
          img.style.opacity   = '1'
          img.style.transform = 'scale(1.06)'
        })
        setTimeout(() => { current?.remove(); current = img }, FADE + 50)
      }
      img.onerror = () => { img.remove(); next() }

      setActiveDot(dotIdx)
      dotIdx++
    }

    next()
    const interval = setInterval(next, DURATION)
    return () => clearInterval(interval)
  }, [])

  if (variant === 'banner') {
    return (
      <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', background: '#0A0A0A' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        {/* gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }} />
        {/* dots */}
        <div
          ref={dotsRef}
          style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}
        />
      </div>
    )
  }

  // panel variant — caller wraps in a positioned container
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        ref={dotsRef}
        style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}
      />
    </div>
  )
}