'use client'

import { Search } from 'lucide-react'
import { MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'
import { STATUS_OPTIONS, STATUS_STYLE, YEAR_OPTIONS } from './memberTableShared'
import type { MemberFiltersApi } from './useMemberFilters'

const selectStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  outline: 'none',
}

// The members list's filter bar: search, the five selects, the show-archived
// toggle, and the result count. All state comes from useMemberFilters.
export default function MembersFilterBar({ f }: { f: MemberFiltersApi }) {
  return (
    <div className="dash-card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={13} style={{
            position: 'absolute', left: 9, top: '50%',
            transform: 'translateY(-50%)', color: '#bbb',
          }} />
          <input
            type="text"
            placeholder="Search name, email, student no..."
            value={f.search}
            onChange={e => f.setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 28,
              paddingRight: 10,
              paddingTop: 7,
              paddingBottom: 7,
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.10)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              color: '#111',
              background: '#F7F7F5',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select style={selectStyle} value={f.filterRole} onChange={e => f.setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="creative_head">Creative Head</option>
          <option value="member">Member</option>
        </select>

        <select style={selectStyle} value={f.filterPosition} onChange={e => f.setFilterPosition(e.target.value)}>
          <option value="all">All Positions</option>
          {MEMBER_ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="none">Unassigned</option>
        </select>

        <select style={selectStyle} value={f.filterYear} onChange={e => f.setFilterYear(e.target.value)}>
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y}>{y === 'all' ? 'All Year Levels' : y}</option>
          ))}
        </select>

        <select style={selectStyle} value={f.filterSkill} onChange={e => f.setFilterSkill(e.target.value)}>
          <option value="all">All Skills</option>
          {f.skillOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select style={selectStyle} value={f.filterStatus} onChange={e => f.setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : STATUS_STYLE[s]?.label ?? s}
            </option>
          ))}
        </select>

        {/* Show archived toggle */}
        {f.archivedCount > 0 && (
          <button
            onClick={() => f.setShowArchived(p => !p)}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: f.showArchived ? '#111' : '#fff',
              color: f.showArchived ? '#fff' : '#555',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.showArchived ? '✓ Showing Archived' : `Show Archived (${f.archivedCount})`}
          </button>
        )}
      </div>

      <p style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 10,
        color: '#bbb',
        marginTop: 10,
        letterSpacing: '0.05em',
      }}>
        {f.filtered.length} MEMBER{f.filtered.length !== 1 ? 'S' : ''}
      </p>
    </div>
  )
}
