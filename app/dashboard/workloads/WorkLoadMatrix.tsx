'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, CalendarDays, ListChecks, CheckCircle2, Scale } from 'lucide-react'
import { StatCard } from './MatrixBits'
import MatrixToolbar from './MatrixToolbar'
import MatrixSaveBar from './MatrixSaveBar'
import MatrixTable from './MatrixTable'
import MatrixMobile from './MatrixMobile'
import { useWorkloadMarks } from './useWorkloadMarks'
import { useMatrixView } from './useMatrixView'
import type { MarksMap, Matrix, MatrixEvent, Member } from './matrixTypes'

// Orchestrator for the workload matrix. State lives in two hooks —
// useWorkloadMarks (marks + persistence) and useMatrixView (filters + derived
// stats) — and the views (toolbar, save bar, table, mobile cards) are
// presentation-only siblings in this folder.

export default function WorkloadMatrix({
  members,
  events,
  matrix,
  initialMarksMap,
  canManage,
  highlightMember = null,
  highlightEvent = null,
}: {
  members: Member[]
  events: MatrixEvent[]
  matrix: Matrix
  initialMarksMap: MarksMap
  canManage: boolean
  highlightMember?: string | null
  highlightEvent?: string | null
}) {
  const marks = useWorkloadMarks({ matrix, initialMarksMap })
  const view = useMatrixView({
    members,
    events,
    matrix,
    marksMap: marks.marksMap,
    pending: marks.pending,
    getDisplayMark: marks.getDisplayMark,
    highlightMember,
  })

  // Deep-link highlight: scroll the targeted member/event cell into view and
  // flash a ring around it for a few seconds.
  const highlightKey = highlightMember && highlightEvent ? `${highlightMember}_${highlightEvent}` : null
  const [showHighlight, setShowHighlight] = useState(!!highlightKey)
  const highlightRef = useRef<HTMLTableCellElement | null>(null)

  useEffect(() => {
    if (!highlightKey) return
    const el = highlightRef.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    const t = setTimeout(() => setShowHighlight(false), 4000)
    return () => clearTimeout(t)
  }, [highlightKey])

  return (
    <div className="flex flex-col gap-4">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Members" value={members.length} accent="#3b82f6" delay="0ms" />
        <StatCard icon={CalendarDays} label="Events" value={events.length} accent="#7c3aed" delay="40ms" />
        <StatCard icon={ListChecks} label="Total Duties" value={view.overallTotal} accent="#0891b2" delay="80ms" />
        <StatCard
          icon={CheckCircle2}
          label="Reviewed"
          value={view.overallReviewed}
          sub={view.overallTotal > 0 ? `${view.completionRate}% complete` : undefined}
          accent="#16a34a"
          delay="120ms"
        />
        <StatCard
          icon={Scale}
          label="Avg Workload"
          value={view.avgTotal.toFixed(1)}
          sub={`min ${view.minTotal} · max ${view.maxTotal}`}
          accent="#ca8a04"
          delay="160ms"
        />
      </div>

      <MatrixToolbar
        search={view.search}
        onSearch={view.setSearch}
        dutyTypeFilter={view.dutyTypeFilter}
        onDutyTypeFilter={view.setDutyTypeFilter}
        dutyTypeOptions={view.dutyTypeOptions}
        sortBy={view.sortBy}
        onSortBy={view.setSortBy}
        canManage={canManage}
      />

      <MatrixSaveBar
        pendingCount={Object.keys(marks.pending).length}
        saving={marks.saving}
        saveError={marks.saveError}
        saveSuccess={marks.saveSuccess}
        onSave={marks.handleSave}
        onDiscard={marks.handleDiscard}
      />

      {/* Matrix */}
      {events.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No events found for this academic year.</p>
          <Link href="/dashboard/events/new" className="btn-secondary" style={{ marginTop: 14, display: 'inline-flex' }}>
            Create an event
          </Link>
        </div>
      ) : members.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No active members found.</p>
        </div>
      ) : view.visibleMembers.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>No members match your search or filter.</p>
          <button
            className="btn-secondary"
            style={{ marginTop: 14 }}
            onClick={() => { view.setSearch(''); view.setDutyTypeFilter('all') }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <MatrixTable
            events={events}
            visibleMembers={view.visibleMembers}
            matrix={matrix}
            memberStats={view.memberStats}
            maxTotal={view.maxTotal}
            overallTotal={view.overallTotal}
            canManage={canManage}
            pending={marks.pending}
            getDisplayMark={marks.getDisplayMark}
            onCellClick={marks.handleCellClick}
            showHighlight={showHighlight}
            highlightKey={highlightKey}
            highlightRef={highlightRef}
          />

          <MatrixMobile
            events={events}
            visibleMembers={view.visibleMembers}
            matrix={matrix}
            memberStats={view.memberStats}
            maxTotal={view.maxTotal}
            canManage={canManage}
            getDisplayMark={marks.getDisplayMark}
            onCellClick={marks.handleCellClick}
            expanded={view.expanded}
            onToggle={view.toggleExpanded}
            showHighlight={showHighlight}
            highlightKey={highlightKey}
          />

          {/* Footer summary */}
          <div className="dash-card" style={{ padding: '14px 18px' }}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{view.noDutyCount}</span> member{view.noDutyCount !== 1 ? 's' : ''} with no duties
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{view.overallPending}</span> duties pending
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                <span style={{ fontWeight: 600, color: '#555' }}>{view.overallReviewed}</span> of {view.overallTotal} reviewed
              </p>
              {view.overallTotal > 0 && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>{view.completionRate}%</span> completion rate
                </p>
              )}
              {view.visibleMembers.length !== members.length && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 0 auto' }}>
                  Showing <span style={{ fontWeight: 600, color: '#555' }}>{view.visibleMembers.length}</span> of {members.length} members
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
