'use client'

import { Search } from 'lucide-react'
import { MEMBER_ROLE_OPTIONS } from '@/lib/memberRole'
import FilterPopover from '@/components/ui/FilterPopover'
import { STATUS_OPTIONS, STATUS_STYLE, YEAR_OPTIONS } from './memberTableShared'
import type { MemberFiltersApi } from './useMemberFilters'

const selectStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// Compact bar: search inline, everything else in a floating popover so the
// table never gets pushed down. All state comes from useMemberFilters.
export default function MembersFilterBar({ f }: { f: MemberFiltersApi }) {
  const activeCount =
    (f.filterRole !== 'all' ? 1 : 0) +
    (f.filterPosition !== 'all' ? 1 : 0) +
    (f.filterYear !== 'all' ? 1 : 0) +
    (f.filterSkill !== 'all' ? 1 : 0) +
    (f.filterStatus !== 'all' ? 1 : 0) +
    (f.showArchived ? 1 : 0)

  return (
    <div className="dash-card" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#6b7280',
          }} />
          <input
            type="text"
            placeholder="Search name, email, student no..."
            value={f.search}
            onChange={e => f.setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 30px',
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

        <p style={{
          fontFamily: 'DM Mono, monospace', fontSize: 10.5, color: '#6b7280',
          letterSpacing: '0.05em', whiteSpace: 'nowrap', margin: 0,
        }} className="hidden sm:block">
          {f.filtered.length} MEMBER{f.filtered.length !== 1 ? 'S' : ''}
        </p>

        <FilterPopover activeCount={activeCount} panelWidth={320}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid grid-cols-2 gap-2.5">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelStyle}>Role</span>
                <select style={selectStyle} value={f.filterRole} onChange={e => f.setFilterRole(e.target.value)}>
                  <option value="all">All Roles</option>
                  <option value="creative_head">Creative Head</option>
                  <option value="member">Member</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelStyle}>Position</span>
                <select style={selectStyle} value={f.filterPosition} onChange={e => f.setFilterPosition(e.target.value)}>
                  <option value="all">All Positions</option>
                  {MEMBER_ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="none">Unassigned</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelStyle}>Year Level</span>
                <select style={selectStyle} value={f.filterYear} onChange={e => f.setFilterYear(e.target.value)}>
                  {YEAR_OPTIONS.map(y => (
                    <option key={y} value={y}>{y === 'all' ? 'All Year Levels' : y}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={labelStyle}>Skill</span>
                <select style={selectStyle} value={f.filterSkill} onChange={e => f.setFilterSkill(e.target.value)}>
                  <option value="all">All Skills</option>
                  {f.skillOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={labelStyle}>Status</span>
              <select style={selectStyle} value={f.filterStatus} onChange={e => f.setFilterStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All Statuses' : STATUS_STYLE[s]?.label ?? s}
                  </option>
                ))}
              </select>
            </label>

            {f.archivedCount > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#333', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={f.showArchived}
                  onChange={() => f.setShowArchived(p => !p)}
                  style={{ width: 14, height: 14, cursor: 'pointer' }}
                />
                Show archived ({f.archivedCount})
              </label>
            )}
          </div>
        </FilterPopover>
      </div>
    </div>
  )
}
