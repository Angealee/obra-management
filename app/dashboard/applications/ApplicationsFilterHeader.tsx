'use client'

import { Search, Trash2, X, XCircle } from 'lucide-react'
import FilterPopover from '@/components/ui/FilterPopover'
import type { ApplicationStatus } from '@/types/database'
import {
  MIN_SCORE_OPTIONS, POSITION_LABELS, POSITION_OPTIONS, SORT_OPTIONS,
  STATUS_COLORS, STATUS_OPTIONS, YEAR_OPTIONS, type ReviewFilter,
} from './applicationConstants'
import type { ApplicationFiltersApi } from './useApplicationFilters'

const selectStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
  outline: 'none',
}

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 7,
  border: '1px solid rgba(0,0,0,0.10)',
  background: '#fff',
  color: '#6b7280',
  cursor: 'pointer',
}

// The list panel's header: review segmented toggle, search, the collapsible
// filter/sort dropdowns, active filter chips, result count, and (consultant)
// bulk-action buttons. All state comes from useApplicationFilters.
export default function ApplicationsFilterHeader({
  f,
  isConsultant,
  resultCount,
  selectedCount,
  onRequestBulk,
}: {
  f: ApplicationFiltersApi
  isConsultant: boolean
  resultCount: number
  selectedCount: number
  onRequestBulk: (action: 'reject' | 'delete') => void
}) {
  return (
    <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>

      {/* Review segmented toggle — scoped to the signed-in reviewer */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 12,
        background: '#F2F2F0', borderRadius: 9, padding: 3,
      }}>
        {([
          { key: 'all',    label: 'All',      title: 'All applicants' },
          { key: 'needs',  label: 'To score',  title: 'Still in the pipeline and not yet scored by you' },
          { key: 'scored', label: 'Scored',   title: "Applicants you've already scored" },
        ] as { key: ReviewFilter; label: string; title: string }[]).map(seg => {
          const active = f.reviewFilter === seg.key
          return (
            <button
              key={seg.key}
              type="button"
              title={seg.title}
              onClick={() => f.setReviewFilter(seg.key)}
              style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 4px', borderRadius: 7, border: 'none',
                background: active ? '#fff' : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                color: active ? '#CC0000' : '#6b7280',
                fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'background 0.13s ease, color 0.13s ease',
              }}
            >
              {seg.label}
              {seg.key === 'needs' && f.needsReviewCount > 0 && (
                <span style={{
                  minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                  background: active ? '#CC0000' : '#d6d6d2',
                  color: active ? '#fff' : '#555',
                  fontFamily: 'DM Mono, monospace', fontSize: 9.5, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {f.needsReviewCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + filter toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: '#6b7280',
          }} />
          <input
            type="text"
            placeholder="Search name or email…"
            value={f.search}
            onChange={e => f.setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 9,
              paddingBottom: 9,
              borderRadius: 9,
              border: '1px solid rgba(0,0,0,0.10)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              color: '#111',
              background: '#F7F7F5',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {/* Floating filter panel — the list below never shifts */}
        <FilterPopover activeCount={f.activeFilterCount} panelWidth={296}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="grid grid-cols-2 gap-2.5">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={fieldLabelStyle}>Status</span>
              <select style={selectStyle} value={f.filterStatus} onChange={e => f.setFilterStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All' : STATUS_COLORS[s as ApplicationStatus]?.label ?? s}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={fieldLabelStyle}>Position</span>
              <select style={selectStyle} value={f.filterPosition} onChange={e => f.setFilterPosition(e.target.value)}>
                {POSITION_OPTIONS.map(p => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All' : POSITION_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={fieldLabelStyle}>Year Level</span>
              <select style={selectStyle} value={f.filterYear} onChange={e => f.setFilterYear(e.target.value)}>
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>
                    {y === 'all' ? 'All' : y}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={fieldLabelStyle}>Min Score</span>
              <select style={selectStyle} value={f.minScore} onChange={e => f.setMinScore(e.target.value)}>
                {MIN_SCORE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={fieldLabelStyle}>Sort By</span>
            <select style={selectStyle} value={f.sortBy} onChange={e => f.setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          </div>
        </FilterPopover>
      </div>

      {/* Active filter chips */}
      {f.activeFilterCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 }}>
          {f.activeChips.map(c => (
            <button key={c.key} type="button" className="filter-chip" onClick={c.onRemove} title={`Remove ${c.label}`}>
              {c.label}
              <X size={12} className="chip-x" />
            </button>
          ))}
          <button
            type="button"
            onClick={f.clearFilters}
            style={{
              background: 'none', border: 'none', padding: '2px 4px',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              color: '#CC0000', cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result count + bulk actions */}
      <div className="mt-3 flex items-center justify-between" style={{ minHeight: 24 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12.5,
          fontWeight: 500,
          color: '#6b7280',
        }}>
          {resultCount} applicant{resultCount !== 1 ? 's' : ''}
        </p>

        {isConsultant && selectedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {selectedCount} selected
            </span>
            <button type="button" title="Reject selected" style={iconBtnStyle}
              onClick={() => onRequestBulk('reject')}>
              <XCircle size={14} />
            </button>
            <button type="button" title="Delete selected" style={{ ...iconBtnStyle, color: '#CC0000', borderColor: 'rgba(204,0,0,0.22)' }}
              onClick={() => onRequestBulk('delete')}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
