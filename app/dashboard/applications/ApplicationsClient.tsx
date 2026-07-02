'use client'

import { ArrowLeft } from 'lucide-react'
import { MemberApplication } from '@/types/database'
import { useApplicationFilters } from './useApplicationFilters'
import { useListNavigation } from './useListNavigation'
import { useBulkActions } from './useBulkActions'
import ApplicationsFilterHeader from './ApplicationsFilterHeader'
import ApplicationListItem from './ApplicationListItem'
import BulkConfirmModal from './BulkConfirmModal'

// Orchestrator for the applications split view. State lives in three hooks —
// useApplicationFilters (search/filter/sort, persisted per device),
// useListNavigation (URL-derived selection + keyboard cursor), and
// useBulkActions (consultant reject/delete) — and the views (filter header,
// list rows, confirm modal) are presentation-only siblings in this folder.

type Props = {
  applications: MemberApplication[]
  userRole: string
  userId: string
  children: React.ReactNode
}

export default function ApplicationsClient({ applications, userRole, userId, children }: Props) {
  const isConsultant = userRole === 'consultant'

  const f = useApplicationFilters(applications)
  const nav = useListNavigation(f.filtered)
  const bulk = useBulkActions({ userId, selectedId: nav.selectedId })

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-140px)] lg:flex-row lg:overflow-hidden">

      {/* LEFT — list panel */}
      <div
        className={`${nav.selectedId ? 'hidden lg:flex' : 'flex'} h-[calc(100vh-260px)] min-h-[420px] w-full flex-col lg:h-full lg:w-[330px] lg:flex-shrink-0`}
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <ApplicationsFilterHeader
          f={f}
          isConsultant={isConsultant}
          resultCount={f.filtered.length}
          selectedCount={bulk.selectedIds.size}
          onRequestBulk={bulk.setConfirmAction}
        />

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {f.filtered.length === 0 ? (
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              color: '#6b7280',
              lineHeight: 1.6,
            }}>
              No applicants match your filters.
            </div>
          ) : (
            f.filtered.map((app, idx) => (
              <ApplicationListItem
                key={app.id}
                app={app}
                idx={idx}
                isSelected={app.id === nav.selectedId}
                isCursor={idx === nav.cursorIndex}
                isItemPending={nav.isPending && nav.pendingId === app.id}
                checked={bulk.selectedIds.has(app.id)}
                isConsultant={isConsultant}
                onNavigate={nav.navigate}
                onToggleSelect={bulk.toggleSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT — detail panel */}
      <div className={`${nav.selectedId ? 'flex' : 'hidden lg:flex'} w-full flex-1 flex-col lg:h-full lg:overflow-y-auto`}>
        {nav.selectedId && (
          <button type="button" onClick={nav.backToList}
            className="btn-secondary lg:hidden"
            style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
            <ArrowLeft size={14} /> Back to list
          </button>
        )}
        <div style={{ position: 'relative', flex: 1 }}>
          {nav.isPending && (
            <div className="loading-bar-track">
              <div className="loading-bar-fill" />
            </div>
          )}
          <div style={{
            opacity: nav.isPending ? 0.45 : 1,
            transition: 'opacity 0.15s ease',
          }}>
            {children}
          </div>
        </div>
      </div>

      {/* Bulk action confirmation modal */}
      {bulk.confirmAction && (
        <BulkConfirmModal
          action={bulk.confirmAction}
          count={bulk.selectedIds.size}
          loading={bulk.bulkLoading}
          error={bulk.bulkError}
          onCancel={() => bulk.setConfirmAction(null)}
          onConfirm={bulk.runBulkAction}
        />
      )}
    </div>
  )
}
