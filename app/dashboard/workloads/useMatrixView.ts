import { useMemo, useState } from 'react'
import { dutyDisplayStatus } from '@/lib/dutyStatus'
import {
  getMemberSkills,
  type Mark,
  type MarksMap,
  type Matrix,
  type MatrixEvent,
  type Member,
  type MemberCounts,
  type PendingMap,
  type SortOption,
} from './matrixTypes'

// Derived view state for the matrix: search / role filter / sort, per-member
// workload counts, and the aggregate footer numbers. Pure derivation —
// persistence lives in useWorkloadMarks.

export function useMatrixView({
  members,
  events,
  matrix,
  marksMap,
  pending,
  getDisplayMark,
  highlightMember,
}: {
  members: Member[]
  events: MatrixEvent[]
  matrix: Matrix
  marksMap: MarksMap
  pending: PendingMap
  getDisplayMark: (memberId: string, eventId: string) => Mark
  highlightMember: string | null
}) {
  const [search, setSearch] = useState('')
  const [dutyTypeFilter, setDutyTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('alpha')
  // Pre-expand the highlighted member's card (mobile) so the deep-linked cell is visible.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    highlightMember ? { [highlightMember]: true } : {}
  )

  function toggleExpanded(memberId: string) {
    setExpanded(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  // Per-member workload counts, excluding events marked "did not duty".
  // An event counts toward the total if it has assigned duty record(s), or —
  // when no duty record exists — if it carries a "completed"/"late" mark.
  function getMemberCounts(memberId: string): MemberCounts {
    let total = 0
    let reviewed = 0
    let pendingCount = 0
    for (const event of events) {
      const mark = getDisplayMark(memberId, event.id)
      if (mark === 'did_not_duty') continue
      const cellDuties = matrix[memberId]?.[event.id] ?? []
      if (cellDuties.length > 0) {
        total += cellDuties.length
        reviewed += cellDuties.filter(d => dutyDisplayStatus(d) === 'reviewed').length
        pendingCount += cellDuties.filter(d => d.status === 'pending').length
      } else if (mark === 'completed' || mark === 'late') {
        total += 1
      }
    }
    return { total, reviewed, pendingCount }
  }

  const dutyTypeOptions = useMemo(
    () => Array.from(new Set(members.flatMap(getMemberSkills))).sort(),
    [members]
  )

  const memberStats = useMemo(() => {
    const stats: Record<string, MemberCounts> = {}
    for (const m of members) {
      stats[m.id] = getMemberCounts(m.id)
    }
    return stats
    // getDisplayMark is a fresh closure each render; the data it reads is
    // marksMap + pending, so those are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, events, matrix, marksMap, pending])

  const visibleMembers = useMemo(() => {
    let list = members.filter(m => {
      if (search.trim() && !m.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (dutyTypeFilter !== 'all' && !getMemberSkills(m).includes(dutyTypeFilter)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'alpha_desc': return b.full_name.localeCompare(a.full_name)
        case 'most':       return memberStats[b.id].total - memberStats[a.id].total || a.full_name.localeCompare(b.full_name)
        case 'least':      return memberStats[a.id].total - memberStats[b.id].total || a.full_name.localeCompare(b.full_name)
        default:           return a.full_name.localeCompare(b.full_name)
      }
    })
    return list
  }, [members, search, dutyTypeFilter, sortBy, memberStats])

  const totals = members.map(m => memberStats[m.id].total)
  const overallTotal = totals.reduce((s, t) => s + t, 0)
  const overallReviewed = members.reduce((s, m) => s + memberStats[m.id].reviewed, 0)
  const overallPending = members.reduce((s, m) => s + memberStats[m.id].pendingCount, 0)
  const maxTotal = Math.max(1, ...totals)
  const minTotal = totals.length ? Math.min(...totals) : 0
  const avgTotal = totals.length ? overallTotal / totals.length : 0
  const noDutyCount = totals.filter(t => t === 0).length
  const completionRate = overallTotal > 0 ? Math.round((overallReviewed / overallTotal) * 100) : 0

  return {
    search, setSearch,
    dutyTypeFilter, setDutyTypeFilter,
    sortBy, setSortBy,
    expanded, toggleExpanded,
    dutyTypeOptions,
    memberStats,
    visibleMembers,
    overallTotal, overallReviewed, overallPending,
    maxTotal, minTotal, avgTotal,
    noDutyCount, completionRate,
  }
}
