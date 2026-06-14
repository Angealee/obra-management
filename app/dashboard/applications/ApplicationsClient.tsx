'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MemberApplication, ApplicationStatus } from '@/types/database'
import { Search, ArrowLeft, Loader2, AlertTriangle, Star, Trash2, XCircle, SlidersHorizontal, X } from 'lucide-react'
import { getInitials, getAvatarColor, STATUS_ACCENTS } from './utils'

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  shortlisted: { bg: '#dbeafe', color: '#1e40af', label: 'Shortlisted' },
  interviewed: { bg: '#f3e8ff', color: '#6b21a8', label: 'Interviewed' },
  approved:    { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected:    { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  withdrawn:   { bg: '#f3f4f6', color: '#4b5563', label: 'Withdrawn' },
}

const POSITION_LABELS: Record<string, string> = {
  photographer:     'Photographer',
  photo_editor:     'Photo Editor',
  videographer:     'Videographer',
  video_editor:     'Video Editor',
  graphic_designer: 'Graphic Designer',
  animator:         'Animator',
}

const STATUS_OPTIONS = ['all', 'pending', 'shortlisted', 'interviewed', 'approved', 'rejected', 'withdrawn']
const POSITION_OPTIONS = ['all', 'photographer', 'photo_editor', 'videographer', 'video_editor', 'graphic_designer', 'animator']
const YEAR_OPTIONS = ['all', '1st Year', '2nd Year', '3rd Year', '4th Year']

const SORT_OPTIONS = [
  { value: 'name',       label: 'Name (A–Z)' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'score_desc', label: 'Highest Score' },
  { value: 'score_asc',  label: 'Lowest Score' },
]

const MIN_SCORE_OPTIONS = [
  { value: '0', label: 'Any Score' },
  { value: '8', label: '8+ Score' },
  { value: '6', label: '6+ Score' },
  { value: '4', label: '4+ Score' },
]

type Props = {
  applications: MemberApplication[]
  userRole: string
  userId: string
  children: React.ReactNode
}

export default function ApplicationsClient({ applications, userRole, userId, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const isConsultant = userRole === 'consultant'

  // The selected applicant is derived from the URL, not held in state — so the
  // list/filter state in this component (which now lives in the persistent
  // layout) survives navigation between applicants.
  const selectedId = useMemo(() => {
    const m = pathname?.match(/\/dashboard\/applications\/([^/?#]+)/)
    return m ? m[1] : null
  }, [pathname])

  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [filtersOpen, setFiltersOpen]       = useState(false)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [filterYear, setFilterYear]         = useState('all')
  const [sortBy, setSortBy]                 = useState('name')
  const [minScore, setMinScore]             = useState('0')

  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<'reject' | 'delete' | null>(null)
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkError, setBulkError]         = useState<string | null>(null)

  const filtered = useMemo(() => {
    return applications
      .filter(a => {
        const matchSearch =
          a.full_name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
        const matchStatus   = filterStatus   === 'all' || a.status === filterStatus
        const matchPosition = filterPosition === 'all' || a.positions.includes(filterPosition)
        const matchYear     = filterYear     === 'all' || a.year_level === filterYear
        const matchScore    = (a.avgScore ?? 0) >= Number(minScore)
        return matchSearch && matchStatus && matchPosition && matchYear && matchScore
      })
      .sort((a, b) => {
        if (sortBy === 'score_desc') return (b.avgScore ?? -1) - (a.avgScore ?? -1)
        if (sortBy === 'score_asc')  return (a.avgScore ?? 11) - (b.avgScore ?? 11)
        if (sortBy === 'newest')     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return a.full_name.localeCompare(b.full_name)
      })
  }, [applications, search, filterStatus, filterPosition, filterYear, sortBy, minScore])

  // Active non-default filters, rendered as removable chips.
  const activeChips: { key: string; label: string; onRemove: () => void }[] = []
  if (filterStatus !== 'all')   activeChips.push({ key: 'status',   label: STATUS_COLORS[filterStatus as ApplicationStatus]?.label ?? filterStatus, onRemove: () => setFilterStatus('all') })
  if (filterPosition !== 'all') activeChips.push({ key: 'position', label: POSITION_LABELS[filterPosition] ?? filterPosition, onRemove: () => setFilterPosition('all') })
  if (filterYear !== 'all')     activeChips.push({ key: 'year',     label: filterYear, onRemove: () => setFilterYear('all') })
  if (minScore !== '0')         activeChips.push({ key: 'score',    label: `Score ${minScore}+`, onRemove: () => setMinScore('0') })
  const activeFilterCount = activeChips.length

  function clearFilters() {
    setFilterStatus('all')
    setFilterPosition('all')
    setFilterYear('all')
    setMinScore('0')
  }

  function navigate(id: string) {
    if (id === selectedId) return
    setPendingId(id)
    startTransition(() => router.push(`/dashboard/applications/${id}`))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function runBulkAction() {
    if (!confirmAction || selectedIds.size === 0) return
    setBulkLoading(true)
    setBulkError(null)
    const ids = Array.from(selectedIds)

    const { error } = confirmAction === 'reject'
      ? await supabase
          .from('member_applications')
          .update({ status: 'rejected', reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .in('id', ids)
      : await supabase
          .from('member_applications')
          .delete()
          .in('id', ids)

    setBulkLoading(false)

    if (error) {
      setBulkError(`Failed to ${confirmAction} the selected applications.`)
      return
    }

    const removingSelected = confirmAction === 'delete' && selectedId !== null && ids.includes(selectedId)
    setSelectedIds(new Set())
    setConfirmAction(null)

    if (removingSelected) {
      router.push('/dashboard/applications')
    } else {
      router.refresh()
    }
  }

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
    color: '#777',
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
    color: '#777',
    cursor: 'pointer',
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-140px)] lg:flex-row lg:overflow-hidden">

      {/* LEFT — list panel */}
      <div
        className={`${selectedId ? 'hidden lg:flex' : 'flex'} h-[calc(100vh-260px)] min-h-[420px] w-full flex-col lg:h-full lg:w-[330px] lg:flex-shrink-0`}
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >

        {/* Filter header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>

          {/* Search + filter toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{
                position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: '#aaa',
              }} />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
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
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              title="Filters & sorting"
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, flexShrink: 0,
                borderRadius: 9,
                border: filtersOpen ? '1px solid #CC0000' : '1px solid rgba(0,0,0,0.10)',
                background: filtersOpen ? '#fef2f2' : '#F7F7F5',
                color: filtersOpen ? '#CC0000' : '#555',
                cursor: 'pointer',
                transition: 'background 0.13s ease, border-color 0.13s ease, color 0.13s ease',
              }}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 999,
                  background: '#CC0000', color: '#fff',
                  fontFamily: 'DM Mono, monospace', fontSize: 9.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter / sort dropdowns */}
          {filtersOpen && (
            <div className="panel-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div className="grid grid-cols-2 gap-2.5">
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={fieldLabelStyle}>Status</span>
                  <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {s === 'all' ? 'All' : STATUS_COLORS[s as ApplicationStatus]?.label ?? s}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={fieldLabelStyle}>Position</span>
                  <select style={selectStyle} value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
                    {POSITION_OPTIONS.map(p => (
                      <option key={p} value={p}>
                        {p === 'all' ? 'All' : POSITION_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={fieldLabelStyle}>Year Level</span>
                  <select style={selectStyle} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                    {YEAR_OPTIONS.map(y => (
                      <option key={y} value={y}>
                        {y === 'all' ? 'All' : y}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={fieldLabelStyle}>Min Score</span>
                  <select style={selectStyle} value={minScore} onChange={e => setMinScore(e.target.value)}>
                    {MIN_SCORE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={fieldLabelStyle}>Sort By</span>
                <select style={selectStyle} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 }}>
              {activeChips.map(c => (
                <button key={c.key} type="button" className="filter-chip" onClick={c.onRemove} title={`Remove ${c.label}`}>
                  {c.label}
                  <X size={12} className="chip-x" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
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
              color: '#888',
            }}>
              {filtered.length} applicant{filtered.length !== 1 ? 's' : ''}
            </p>

            {isConsultant && selectedIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#777', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  {selectedIds.size} selected
                </span>
                <button type="button" title="Reject selected" style={iconBtnStyle}
                  onClick={() => setConfirmAction('reject')}>
                  <XCircle size={14} />
                </button>
                <button type="button" title="Delete selected" style={{ ...iconBtnStyle, color: '#CC0000', borderColor: 'rgba(204,0,0,0.22)' }}
                  onClick={() => setConfirmAction('delete')}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              color: '#999',
              lineHeight: 1.6,
            }}>
              No applicants match your filters.
            </div>
          ) : (
            filtered.map(app => {
              const s = STATUS_COLORS[app.status]
              const accent = STATUS_ACCENTS[app.status]
              const isSelected = app.id === selectedId
              const isItemPending = isPending && pendingId === app.id
              const checked = selectedIds.has(app.id)
              return (
                <div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(app.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(app.id) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    background: isSelected ? `${accent}14` : 'transparent',
                    borderLeft: isSelected
                      ? `3px solid ${accent}`
                      : '3px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 11,
                    alignItems: 'flex-start',
                    transition: 'background 0.13s ease',
                  }}
                >
                  {isConsultant && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleSelect(app.id)}
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
            })
          )}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} w-full flex-1 flex-col lg:h-full lg:overflow-y-auto`}>
        {selectedId && (
          <button type="button" onClick={() => router.push('/dashboard/applications')}
            className="btn-secondary lg:hidden"
            style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
            <ArrowLeft size={14} /> Back to list
          </button>
        )}
        <div style={{ position: 'relative', flex: 1 }}>
          {isPending && (
            <div className="loading-bar-track">
              <div className="loading-bar-fill" />
            </div>
          )}
          <div style={{
            opacity: isPending ? 0.45 : 1,
            transition: 'opacity 0.15s ease',
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* Bulk action confirmation modal */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}
          onClick={() => !bulkLoading && setConfirmAction(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}
          >
            <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
              {confirmAction === 'delete' ? 'Delete applications?' : 'Reject applications?'}
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: '#555', lineHeight: 1.6, margin: 0 }}>
              {confirmAction === 'delete'
                ? `This will permanently delete ${selectedIds.size} application${selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.`
                : `This will mark ${selectedIds.size} application${selectedIds.size !== 1 ? 's' : ''} as rejected.`}
            </p>
            {bulkError && (
              <div style={{
                marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px', color: '#dc2626',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              }}>
                {bulkError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" className="btn-secondary" disabled={bulkLoading}
                onClick={() => setConfirmAction(null)} style={{ opacity: bulkLoading ? 0.7 : 1 }}>
                Cancel
              </button>
              <button type="button" className="btn-danger" disabled={bulkLoading}
                onClick={runBulkAction} style={{ opacity: bulkLoading ? 0.7 : 1, borderColor: '#CC0000', background: '#CC0000', color: '#fff' }}>
                {bulkLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : confirmAction === 'delete' ? <Trash2 size={13} /> : <XCircle size={13} />}
                {confirmAction === 'delete' ? 'Delete' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
