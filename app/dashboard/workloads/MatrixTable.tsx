'use client'

import Link from 'next/link'
import { useRef, type RefObject } from 'react'
import WorkloadCell from './WorkLoadCell'
import { EVENT_STATUS_STYLE, MemberDot, MiniBar, SkillTag } from './MatrixBits'
import {
  getMemberSkills,
  type Mark, type Matrix, type MatrixEvent, type Member, type MemberCounts, type PendingMap,
} from './matrixTypes'

// Desktop/tablet matrix table: sticky member column, one column per event,
// workload summary column, and the per-event totals footer.
export default function MatrixTable({
  events,
  visibleMembers,
  matrix,
  memberStats,
  maxTotal,
  overallTotal,
  canManage,
  pending,
  getDisplayMark,
  onCellClick,
  showHighlight,
  highlightKey,
  highlightRef,
}: {
  events: MatrixEvent[]
  visibleMembers: Member[]
  matrix: Matrix
  memberStats: Record<string, MemberCounts>
  maxTotal: number
  overallTotal: number
  canManage: boolean
  pending: PendingMap
  getDisplayMark: (memberId: string, eventId: string) => Mark
  onCellClick: (memberId: string, eventId: string) => void
  showHighlight: boolean
  highlightKey: string | null
  highlightRef: RefObject<HTMLTableCellElement | null>
}) {
  // ── Grab-and-pan: hold the mouse down and drag to scroll the wide matrix.
  // Horizontal moves the container's own scrollbar; vertical moves the nearest
  // scrollable ancestor (the dashboard <main>), so one drag pans both axes with
  // no extra scroll region or layout change. A 5px threshold keeps ordinary
  // cell clicks working; once a drag engages, pointer capture stops the
  // underlying cell/link from firing, and the click that follows the release is
  // swallowed in the capture phase. Touch devices keep native scrolling.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef({
    active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0,
    moved: false, vScroller: null as HTMLElement | null,
  })

  // Nearest ancestor that actually scrolls vertically (falls back to the
  // document scroller). This is where the page's vertical scroll lives.
  function findVerticalScroller(from: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = from.parentElement
    while (el) {
      const oy = getComputedStyle(el).overflowY
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el
      el = el.parentElement
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    const vScroller = findVerticalScroller(el)
    const canPanX = el.scrollWidth > el.clientWidth
    const canPanY = !!vScroller && vScroller.scrollHeight > vScroller.clientHeight
    if (!canPanX && !canPanY) return
    drag.current = {
      active: true,
      startX: e.clientX, startY: e.clientY,
      startLeft: el.scrollLeft, startTop: vScroller ? vScroller.scrollTop : 0,
      moved: false, vScroller,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const el = scrollRef.current
    if (!drag.current.active || !el) return
    const dx = e.clientX - drag.current.startX
    const dy = e.clientY - drag.current.startY
    if (!drag.current.moved) {
      if (Math.hypot(dx, dy) < 5) return
      drag.current.moved = true
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
    el.scrollLeft = drag.current.startLeft - dx
    if (drag.current.vScroller) drag.current.vScroller.scrollTop = drag.current.startTop - dy
  }

  function onPointerEnd() {
    const el = scrollRef.current
    drag.current.active = false
    if (el) el.style.cursor = 'grab'
    document.body.style.userSelect = ''
    // drag.current.moved stays true until the trailing click is swallowed.
  }

  function onClickCapture(e: React.MouseEvent) {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }

  return (
    <div className="hidden md:block" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: Math.max(700, 260 + events.length * 110) }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.10)' }}>
              <th
                className="sticky left-0 z-10"
                style={{
                  background: '#F1F1EF', textAlign: 'left', padding: '14px 20px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555',
                  borderRight: '1px solid rgba(0,0,0,0.12)', minWidth: 240,
                }}
              >
                Member
              </th>
              {events.map(event => {
                const es = EVENT_STATUS_STYLE[event.status] ?? EVENT_STATUS_STYLE.upcoming
                return (
                  <th key={event.id} style={{ textAlign: 'center', padding: '12px 8px', minWidth: 104, maxWidth: 120, borderRight: '1px solid rgba(0,0,0,0.07)' }}>
                    <Link href={`/dashboard/events/${event.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{
                        fontSize: 11.5, fontWeight: 600, color: '#555', lineHeight: 1.3, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {event.title}
                      </p>
                      <p style={{ fontSize: 10.5, color: '#bbb', margin: '4px 0 0' }}>
                        {new Date(event.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </p>
                      <span style={{
                        display: 'inline-block', marginTop: 4, fontSize: 9.5, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 999, background: es.bg, color: es.color, textTransform: 'capitalize',
                      }}>
                        {event.status}
                      </span>
                    </Link>
                  </th>
                )
              })}
              <th style={{
                textAlign: 'center', padding: '12px 16px', background: '#F1F1EF', minWidth: 100,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555',
              }}>
                Workload
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleMembers.map(member => {
              const { total, reviewed } = memberStats[member.id]
              const skills = getMemberSkills(member)

              return (
                <tr key={member.id} className="matrix-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', opacity: total === 0 ? 0.6 : 1 }}>
                  <td className="sticky left-0 z-10 matrix-sticky" style={{ padding: '12px 20px', borderRight: '1px solid rgba(0,0,0,0.12)' }}>
                    <Link href={`/dashboard/members/${member.id}`} className="flex items-center gap-3 group/link">
                      <MemberDot name={member.full_name} total={total} />
                      <div className="min-w-0">
                        <p className="truncate group-hover/link:underline" style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>
                          {member.full_name}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: '#bbb' }}>{member.course_section ?? '—'}</span>
                          {skills.slice(0, 2).map(s => <SkillTag key={s} name={s} />)}
                          {skills.length > 2 && <SkillTag name={`+${skills.length - 2}`} />}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {events.map(event => {
                    const cellDuties = matrix[member.id]?.[event.id] ?? []
                    const displayMark = getDisplayMark(member.id, event.id)
                    const isPendingChange = pending[`${member.id}_${event.id}`] !== undefined
                    const isHighlighted = showHighlight && highlightKey === `${member.id}_${event.id}`

                    return (
                      <td
                        key={event.id}
                        ref={isHighlighted ? highlightRef : undefined}
                        style={{
                          padding: '10px 8px', textAlign: 'center',
                          borderRight: '1px solid rgba(0,0,0,0.07)',
                          background: isHighlighted ? '#eff6ff' : isPendingChange ? '#fffbeb' : undefined,
                          boxShadow: isHighlighted ? 'inset 0 0 0 2px #3b82f6' : undefined,
                          transition: 'background 0.3s ease, box-shadow 0.3s ease',
                        }}
                      >
                        <div className="flex justify-center">
                          <WorkloadCell
                            mark={displayMark}
                            dutyStatus={cellDuties[0]?.status ?? null}
                            canEdit={canManage}
                            onClick={() => onCellClick(member.id, event.id)}
                          />
                        </div>
                      </td>
                    )
                  })}

                  <td style={{ padding: '10px 16px', textAlign: 'center', background: '#F7F7F5' }}>
                    {total === 0 ? (
                      <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: 0 }}>
                          {total}
                          {reviewed > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#16a34a' }}> · {reviewed} done</span>}
                        </p>
                        <MiniBar value={total} max={maxTotal} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: '#F1F1EF' }}>
              <td className="sticky left-0 z-10" style={{
                background: '#F1F1EF', padding: '12px 20px',
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#555',
                borderRight: '1px solid rgba(0,0,0,0.06)',
              }}>
                Duties / Event
              </td>
              {events.map(event => (
                <td key={event.id} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 13, fontWeight: 700, color: '#555', borderRight: '1px solid rgba(0,0,0,0.07)' }}>
                  {Object.values(matrix).reduce((c, me) => c + (me[event.id]?.length ?? 0), 0)}
                </td>
              ))}
              <td style={{ textAlign: 'center', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#111', background: '#F1F1EF' }}>
                {overallTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
