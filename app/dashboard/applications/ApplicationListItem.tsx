'use client'

import { AlertTriangle, Loader2, Star } from 'lucide-react'
import type { MemberApplication } from '@/types/database'
import { getInitials, getAvatarColor, STATUS_ACCENTS } from './utils'
import { STATUS_COLORS } from './applicationConstants'

// One applicant row in the list panel. Presentation-only — selection,
// keyboard cursor, and navigation come from the orchestrator's hooks.
export default function ApplicationListItem({
  app,
  idx,
  isSelected,
  isCursor,
  isItemPending,
  checked,
  isConsultant,
  onNavigate,
  onToggleSelect,
}: {
  app: MemberApplication
  idx: number
  isSelected: boolean
  isCursor: boolean
  isItemPending: boolean
  checked: boolean
  isConsultant: boolean
  onNavigate: (id: string) => void
  onToggleSelect: (id: string) => void
}) {
  const s = STATUS_COLORS[app.status]
  const accent = STATUS_ACCENTS[app.status]

  return (
    <div
      data-app-idx={idx}
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(app.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onNavigate(app.id)
        }
      }}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: isSelected ? `${accent}14` : 'transparent',
        borderLeft: isSelected
          ? `3px solid ${accent}`
          : '3px solid transparent',
        boxShadow: isCursor ? 'inset 0 0 0 2px rgba(204,0,0,0.4)' : 'none',
        cursor: 'pointer',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
        transition: 'background 0.13s ease, box-shadow 0.13s ease',
      }}
    >
      {isConsultant && (
        <input
          type="checkbox"
          checked={checked}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleSelect(app.id)}
          style={{ marginTop: 5, flexShrink: 0, cursor: 'pointer', width: 14, height: 14 }}
        />
      )}

      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: getAvatarColor(app.full_name),
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, fontWeight: 700,
      }}>
        {getInitials(app.full_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#111',
            margin: '0 0 2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {app.full_name}
          </p>
          {app.isDuplicate && (
            <AlertTriangle size={13} style={{ color: '#ca8a04', flexShrink: 0, marginBottom: 2 }} />
          )}
        </div>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12.5,
          color: '#666',
          margin: '0 0 7px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {app.year_level} · {app.course_section}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block',
            background: s.bg,
            color: s.color,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 10.5,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 5,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {s.label}
          </span>
          {!!app.scoreCount && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: '#fff7ed', color: '#9a3412',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 11, fontWeight: 700,
              padding: '3px 8px', borderRadius: 5,
            }}>
              <Star size={10} fill="currentColor" />
              {app.avgScore!.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {isItemPending && (
        <Loader2 size={15} className="animate-spin" style={{ color: '#CC0000', flexShrink: 0, marginTop: 9 }} />
      )}
    </div>
  )
}
