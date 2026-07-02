import { useEffect, useMemo, useState } from 'react'
import type { ApplicationStatus, MemberApplication } from '@/types/database'
import {
  FILTERS_KEY, POSITION_LABELS, STATUS_COLORS, TERMINAL_STATUSES, type ReviewFilter,
} from './applicationConstants'

// Filter / sort / search state for the applications list, persisted per-device
// in localStorage, plus the derived filtered+sorted list and the removable
// filter chips. Extracted unchanged from ApplicationsClient.

export function useApplicationFilters(applications: MemberApplication[]) {
  const [filtersOpen, setFiltersOpen]       = useState(false)
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [filterYear, setFilterYear]         = useState('all')
  const [sortBy, setSortBy]                 = useState('name')
  const [minScore, setMinScore]             = useState('0')
  const [reviewFilter, setReviewFilter]     = useState<ReviewFilter>('all')

  // Restore the per-device filter state on first mount (and persist on change).
  // Reading localStorage in an effect — rather than during render — keeps the
  // server/client markup identical and avoids a hydration mismatch.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_KEY)
      if (raw) {
        const s = JSON.parse(raw)
        if (typeof s.search === 'string')         setSearch(s.search)
        if (typeof s.filterStatus === 'string')   setFilterStatus(s.filterStatus)
        if (typeof s.filterPosition === 'string') setFilterPosition(s.filterPosition)
        if (typeof s.filterYear === 'string')     setFilterYear(s.filterYear)
        if (typeof s.sortBy === 'string')         setSortBy(s.sortBy)
        if (typeof s.minScore === 'string')       setMinScore(s.minScore)
        if (s.reviewFilter === 'all' || s.reviewFilter === 'needs' || s.reviewFilter === 'scored') {
          setReviewFilter(s.reviewFilter)
        }
      }
    } catch { /* ignore malformed/blocked storage */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        search, filterStatus, filterPosition, filterYear, sortBy, minScore, reviewFilter,
      }))
    } catch { /* ignore quota/blocked storage */ }
  }, [hydrated, search, filterStatus, filterPosition, filterYear, sortBy, minScore, reviewFilter])

  // How many applicants still need a score from the signed-in reviewer
  // (active-pipeline only — terminal decisions don't count).
  const needsReviewCount = useMemo(
    () => applications.filter(a => !a.scoredByMe && !TERMINAL_STATUSES.has(a.status)).length,
    [applications]
  )

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
        const matchReview   =
          reviewFilter === 'all' ||
          (reviewFilter === 'needs'  && !a.scoredByMe && !TERMINAL_STATUSES.has(a.status)) ||
          (reviewFilter === 'scored' && !!a.scoredByMe)
        return matchSearch && matchStatus && matchPosition && matchYear && matchScore && matchReview
      })
      .sort((a, b) => {
        if (sortBy === 'score_desc') return (b.avgScore ?? -1) - (a.avgScore ?? -1)
        if (sortBy === 'score_asc')  return (a.avgScore ?? 11) - (b.avgScore ?? 11)
        if (sortBy === 'newest')     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return a.full_name.localeCompare(b.full_name)
      })
  }, [applications, search, filterStatus, filterPosition, filterYear, sortBy, minScore, reviewFilter])

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

  return {
    filtersOpen, setFiltersOpen,
    search, setSearch,
    filterStatus, setFilterStatus,
    filterPosition, setFilterPosition,
    filterYear, setFilterYear,
    sortBy, setSortBy,
    minScore, setMinScore,
    reviewFilter, setReviewFilter,
    needsReviewCount,
    filtered,
    activeChips, activeFilterCount, clearFilters,
  }
}

export type ApplicationFiltersApi = ReturnType<typeof useApplicationFilters>
