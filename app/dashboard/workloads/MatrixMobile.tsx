'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import WorkloadCell from './WorkLoadCell'
import { MemberDot, MiniBar, SkillTag } from './MatrixBits'
import {
  getMemberSkills,
  type Mark, type Matrix, type MatrixEvent, type Member, type MemberCounts,
} from './matrixTypes'

// Mobile view: one expandable card per member with a grid of event cells.
export default function MatrixMobile({
  events,
  visibleMembers,
  matrix,
  memberStats,
  maxTotal,
  canManage,
  getDisplayMark,
  onCellClick,
  expanded,
  onToggle,
  showHighlight,
  highlightKey,
}: {
  events: MatrixEvent[]
  visibleMembers: Member[]
  matrix: Matrix
  memberStats: Record<string, MemberCounts>
  maxTotal: number
  canManage: boolean
  getDisplayMark: (memberId: string, eventId: string) => Mark
  onCellClick: (memberId: string, eventId: string) => void
  expanded: Record<string, boolean>
  onToggle: (memberId: string) => void
  showHighlight: boolean
  highlightKey: string | null
}) {
  return (
    <div className="md:hidden flex flex-col gap-2">
      {visibleMembers.map(member => {
        const { total, reviewed } = memberStats[member.id]
        const skills = getMemberSkills(member)
        const isOpen = !!expanded[member.id]

        return (
          <div key={member.id} className="dash-card lift-hover" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => onToggle(member.id)}
              className="flex items-center gap-3 w-full"
              style={{ padding: '14px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <MemberDot name={member.full_name} total={total} size={36} />
              <div className="flex-1 min-w-0">
                <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#111', margin: 0 }}>{member.full_name}</p>
                <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{member.course_section ?? '—'}</span>
                  {skills.slice(0, 2).map(s => <SkillTag key={s} name={s} />)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {total === 0 ? (
                  <span style={{ fontSize: 11.5, color: '#ddd' }}>No duties</span>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
                      {total}
                      {reviewed > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#16a34a' }}> · {reviewed} done</span>}
                    </p>
                    <MiniBar value={total} max={maxTotal} />
                  </>
                )}
              </div>
              {isOpen
                ? <ChevronUp size={16} style={{ color: '#bbb', flexShrink: 0 }} />
                : <ChevronDown size={16} style={{ color: '#bbb', flexShrink: 0 }} />
              }
            </button>

            {isOpen && (
              <div className="panel-reveal" style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" style={{ marginTop: 12 }}>
                  {events.map(event => {
                    const cellDuties = matrix[member.id]?.[event.id] ?? []
                    const displayMark = getDisplayMark(member.id, event.id)
                    const isHighlighted = showHighlight && highlightKey === `${member.id}_${event.id}`

                    return (
                      <div
                        key={event.id}
                        className="flex flex-col items-center gap-1.5"
                        style={{
                          borderRadius: 8,
                          padding: 4,
                          boxShadow: isHighlighted ? '0 0 0 2px #3b82f6' : undefined,
                          background: isHighlighted ? '#eff6ff' : undefined,
                          transition: 'background 0.3s ease, box-shadow 0.3s ease',
                        }}
                      >
                        <WorkloadCell
                          mark={displayMark}
                          dutyStatus={cellDuties[0]?.status ?? null}
                          canEdit={canManage}
                          onClick={() => onCellClick(member.id, event.id)}
                        />
                        <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
                          {event.title.length > 14 ? `${event.title.slice(0, 13)}…` : event.title}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
