'use client'

import {
  Search, ArrowUpAZ, ArrowDownAZ, ArrowUp10, ArrowDown10, type LucideIcon,
} from 'lucide-react'
import type { SortOption } from './matrixTypes'

const SORT_OPTIONS: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: 'alpha',      label: 'A–Z',   icon: ArrowUpAZ },
  { value: 'alpha_desc', label: 'Z–A',   icon: ArrowDownAZ },
  { value: 'most',       label: 'Most',  icon: ArrowDown10 },
  { value: 'least',      label: 'Least', icon: ArrowUp10 },
]

// Search + role filter + sort control + the mark legend.
export default function MatrixToolbar({
  search, onSearch,
  dutyTypeFilter, onDutyTypeFilter, dutyTypeOptions,
  sortBy, onSortBy,
  canManage,
}: {
  search: string
  onSearch: (v: string) => void
  dutyTypeFilter: string
  onDutyTypeFilter: (v: string) => void
  dutyTypeOptions: string[]
  sortBy: SortOption
  onSortBy: (v: SortOption) => void
  canManage: boolean
}) {
  return (
    <div className="dash-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb' }} />
          <input
            className="obra-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search members..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        {/* Duty type filter */}
        {dutyTypeOptions.length > 0 && (
          <select
            className="obra-input"
            style={{ width: 'auto', minWidth: 150, flex: '0 0 auto' }}
            value={dutyTypeFilter}
            onChange={e => onDutyTypeFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {dutyTypeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {/* Sort control */}
        <div style={{ display: 'flex', gap: 3, background: '#F7F7F5', borderRadius: 9, padding: 3, flexShrink: 0 }}>
          {SORT_OPTIONS.map(opt => {
            const active = sortBy === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onSortBy(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, border: 'none',
                  background: active ? '#111' : 'transparent',
                  color: active ? '#fff' : '#888',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <opt.icon size={12} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <span className="section-label">Legend</span>
        {[
          { bg: '#16a34a', label: 'Completed', icon: '✓' },
          { bg: '#ca8a04', label: 'Late', icon: '!' },
          { bg: '#CC0000', label: 'Did Not Duty', icon: '✗' },
        ].map(item => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: item.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
              {item.icon}
            </span>
            {item.label}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, background: '#FCFCFB', border: '1px dashed rgba(0,0,0,0.08)' }} />
          Not assigned
        </span>
        {canManage && (
          <span style={{ fontSize: 11.5, color: '#bbb', fontStyle: 'italic', marginLeft: 'auto' }}>
            Click any cell to cycle marks
          </span>
        )}
      </div>
    </div>
  )
}
