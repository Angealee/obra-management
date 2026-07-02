'use client'

import { useMemberFilters } from './useMemberFilters'
import MembersFilterBar from './MembersFilterBar'
import { MemberMobileCard, MemberDesktopRow } from './MemberRows'
import type { Member } from './memberTableShared'

// Orchestrator for the members list. Filter state lives in useMemberFilters;
// the filter bar and the two row variants (mobile card, desktop table row)
// are presentation-only siblings in this folder.

type Props = {
  members: Member[]
  userRole: string
}

export default function MembersTable({ members }: Props) {
  const f = useMemberFilters(members)

  const emptyState = (
    <div style={{
      padding: '40px 24px',
      textAlign: 'center',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 14,
      color: '#bbb',
    }}>
      No members match your filters.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <MembersFilterBar f={f} />

      {/* Mobile: stacked cards */}
      <div className="md:hidden dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {f.filtered.length === 0 ? emptyState : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {f.filtered.map(member => (
              <MemberMobileCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {f.filtered.length === 0 ? emptyState : (
          <table className="obra-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Year / Section</th>
                <th>Skills</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {f.filtered.map(member => (
                <MemberDesktopRow key={member.id} member={member} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
