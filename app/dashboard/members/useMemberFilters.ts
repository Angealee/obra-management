import { useMemo, useState } from 'react'
import { ROLE_ORDER, type Member } from './memberTableShared'

// Filter/search state for the members list plus the derived filtered+sorted
// list. Extracted unchanged from MembersTable.

export function useMemberFilters(members: Member[]) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterPosition, setFilterPosition] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterSkill, setFilterSkill] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    return members
      .filter(m => {
        // Hide archived by default unless toggle is on
        if (!showArchived && m.member_status === 'archived') return false

        const skills = m.profile_skills
          .map(ps => ps.member_skills?.name ?? '')
          .filter(Boolean)

        const matchSearch =
          m.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (m.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (m.student_number ?? '').toLowerCase().includes(search.toLowerCase())

        const matchRole     = filterRole     === 'all' || m.system_role === filterRole
        const matchPosition = filterPosition === 'all' || (m.member_role ?? 'none') === filterPosition
        const matchYear     = filterYear     === 'all' || m.year_level === filterYear
        const matchSkill    = filterSkill    === 'all' || skills.includes(filterSkill)
        const matchStatus   = filterStatus   === 'all' || m.member_status === filterStatus

        return matchSearch && matchRole && matchPosition && matchYear && matchSkill && matchStatus
      })
      .sort((a, b) => {
        // Primary: role order
        const roleA = ROLE_ORDER[a.system_role] ?? 99
        const roleB = ROLE_ORDER[b.system_role] ?? 99
        if (roleA !== roleB) return roleA - roleB
        // Secondary: alphabetical
        return a.full_name.localeCompare(b.full_name)
      })
  }, [members, search, filterRole, filterPosition, filterYear, filterSkill, filterStatus, showArchived])

  const archivedCount = members.filter(m => m.member_status === 'archived').length

  return {
    search, setSearch,
    filterRole, setFilterRole,
    filterPosition, setFilterPosition,
    filterYear, setFilterYear,
    filterSkill, setFilterSkill,
    filterStatus, setFilterStatus,
    showArchived, setShowArchived,
    filtered,
    archivedCount,
  }
}

export type MemberFiltersApi = ReturnType<typeof useMemberFilters>
