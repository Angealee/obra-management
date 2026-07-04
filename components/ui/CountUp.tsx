'use client'

import { useEffect, useRef, useState } from 'react'

// Number roll-up for stat cards: 0 → value with cubic ease-out (~650ms).
// Respects prefers-reduced-motion (jumps straight to the value).
export default function CountUp({ value, duration = 650 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{display}</>
}
