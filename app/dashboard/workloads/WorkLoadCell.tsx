'use client'

import type { CSSProperties } from 'react'

type Mark = 'completed' | 'late' | 'did_not_duty' | null

const MARK_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  completed:    { bg: '#16a34a', color: '#fff', icon: '✓' },
  late:         { bg: '#ca8a04', color: '#fff', icon: '!' },
  did_not_duty: { bg: '#CC0000', color: '#fff', icon: '✗' },
}

const DUTY_STYLE: Record<string, { bg: string; color: string; icon: string; border?: string }> = {
  pending:     { bg: '#eef2ff', color: '#6366f1', icon: 'P' },
  in_progress: { bg: '#eff6ff', color: '#3b82f6', icon: '…' },
  completed:   { bg: '#fefce8', color: '#ca8a04', icon: '✓' },
  reviewed:    { bg: '#f0fdf4', color: '#16a34a', icon: '★' },
}

export default function WorkloadCell({
  mark,
  dutyStatus,
  canEdit,
  onClick,
}: {
  mark: Mark
  dutyStatus: string | null
  canEdit: boolean
  onClick: () => void
}) {
  const base: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
    cursor: canEdit ? 'pointer' : 'default',
  }

  const interactive = canEdit ? 'matrix-cell-btn hover:scale-110 active:scale-95' : 'matrix-cell-btn'

  if (mark) {
    const s = MARK_STYLE[mark]
    return (
      <button
        onClick={canEdit ? onClick : undefined}
        className={interactive}
        style={{ ...base, background: s.bg, color: s.color, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
      >
        {s.icon}
      </button>
    )
  }

  if (dutyStatus) {
    const s = DUTY_STYLE[dutyStatus] ?? { bg: '#f1f5f9', color: '#64748b', icon: '?' }
    return (
      <button
        onClick={canEdit ? onClick : undefined}
        className={interactive}
        style={{ ...base, background: s.bg, color: s.color, border: '1px solid rgba(0,0,0,0.06)' }}
      >
        {s.icon}
      </button>
    )
  }

  return (
    <button
      onClick={canEdit ? onClick : undefined}
      className={`matrix-cell-btn ${canEdit ? 'hover:border-[#3b82f6] hover:bg-[#eff6ff]' : ''}`}
      style={{ ...base, background: '#fff', border: '1.5px dashed rgba(0,0,0,0.18)' }}
    />
  )
}
