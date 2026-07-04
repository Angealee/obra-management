'use client'

import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

// Uniform "Filters" control: a compact trigger button with an active-count
// badge that opens a FLOATING panel over the content — list pages never shift
// when filters open. Closes on outside click and Escape.
export default function FilterPopover({
  activeCount = 0,
  children,
  align = 'right',
  panelWidth = 300,
}: {
  activeCount?: number
  children: React.ReactNode
  align?: 'left' | 'right'
  panelWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 13px',
          borderRadius: 9,
          border: open ? '1px solid #CC0000' : '1px solid rgba(0,0,0,0.12)',
          background: open ? '#fef2f2' : '#fff',
          color: open ? '#CC0000' : '#555',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.13s ease, border-color 0.13s ease, color 0.13s ease',
        }}
      >
        <SlidersHorizontal size={14} />
        Filters
        {activeCount > 0 && (
          <span style={{
            minWidth: 17, height: 17, padding: '0 5px', borderRadius: 999,
            background: '#CC0000', color: '#fff',
            fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filters"
          className="panel-reveal"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align]: 0,
            zIndex: 45,
            width: `min(${panelWidth}px, calc(100vw - 40px))`,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.09)',
            borderRadius: 12,
            boxShadow: '0 14px 40px rgba(0,0,0,0.16)',
            padding: 14,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
