'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  accentColor: string
  children: React.ReactNode
}

export default function StickyHeader({ accentColor, children }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} style={{ height: 0 }} />
      <div className="dash-card" style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 30,
        padding: '16px 24px',
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: stuck ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
        transition: 'box-shadow 0.2s ease',
      }}>
        {children}
      </div>
    </>
  )
}
