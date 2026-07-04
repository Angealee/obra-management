'use client'

import {
  Search, ArrowUpAZ, ArrowDownAZ, ArrowUp10, ArrowDown10, type LucideIcon,
} from 'lucide-react'
import FilterPopover from '@/components/ui/FilterPopover'
import type { SortOption } from './matrixTypes'

const SORT_OPTIONS: { value: SortOption; label: string; icon: LucideIcon }[] = [
  { value: 'alpha',      label: 'A–Z',   icon: ArrowUpAZ },
  { value: 'alpha_desc', label: 'Z–A',   icon: ArrowDownAZ },
  { value: 'most',       label: 'Most',  icon: ArrowDown10 },
  { value: 'least',      label: 'Least', icon: ArrowUp10 },
]

// One slim row: search + sort stay inline (constant use); the role filter and
// the mark legend live in the floating Filters panel, so the matrix itself
// starts higher on the screen and never shifts.
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
    <div className="dash-card" style={{ padding: 12 }}>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            className="obra-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search members..."
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

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
                  color: active ? '#fff' : '#6b7280',
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

        <FilterPopover activeCount={dutyTypeFilter !== 'all' ? 1 : 0} panelWidth={300}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dutyTypeOptions.length > 0 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Skill
                </span>
                <select
                  className="obra-input"
                  value={dutyTypeFilter}
                  onChange={e => onDutyTypeFilter(e.target.value)}
                >
                  <option value="all">All roles</option>
                  {dutyTypeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Legend — the matrix notation, explained where you look for it */}
            <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p className="section-label" style={{ marginBottom: 8 }}>Legend</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { bg: '#16a34a', label: 'Completed', icon: '✓' },
                  { bg: '#ca8a04', label: 'Late', icon: '!' },
                  { bg: '#CC0000', label: 'Did Not Duty', icon: '✗' },
                ].map(item => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#555' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: item.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#555' }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: '#FCFCFB', border: '1px dashed rgba(0,0,0,0.12)', flexShrink: 0 }} />
                  Not assigned
                </span>
              </div>
              {canManage && (
                <p style={{ fontSize: 11.5, color: '#6b7280', fontStyle: 'italic', margin: '10px 0 0' }}>
                  Click any matrix cell to cycle marks.
                </p>
              )}
            </div>
          </div>
        </FilterPopover>
      </div>
    </div>
  )
}
