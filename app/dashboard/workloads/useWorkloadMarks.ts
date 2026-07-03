import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Mark, MarksMap, PendingMap } from './matrixTypes'

// The mutation heart of the workload matrix: local mark state, the
// click-to-cycle interaction, and persistence (save/discard).
//
// Persistence goes through /api/workloads/save, which upserts the marks,
// keeps the matching duty records in sync (review stamps), and pushes
// "your outcome was recorded" to each marked member in-process — so
// notification delivery no longer depends on this browser staying open.

const CYCLE: Mark[] = ['completed', 'late', 'did_not_duty', null]

export function useWorkloadMarks({
  initialMarksMap,
}: {
  initialMarksMap: MarksMap
}) {
  const router = useRouter()

  // Local marks state — key: `memberId_eventId`
  const [marksMap, setMarksMap] = useState<MarksMap>(initialMarksMap)
  // Pending changes — key: `memberId_eventId`, value: new mark
  const [pending, setPending] = useState<PendingMap>({})

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const hasPending = Object.keys(pending).length > 0

  function handleCellClick(memberId: string, eventId: string) {
    const key = `${memberId}_${eventId}`
    const currentMark = (pending[key] !== undefined ? pending[key] : marksMap[key]?.mark ?? null) as Mark
    const nextMark = CYCLE[(CYCLE.indexOf(currentMark) + 1) % CYCLE.length]

    setPending(prev => ({ ...prev, [key]: nextMark }))
    setSaveSuccess(false)
  }

  function getDisplayMark(memberId: string, eventId: string): Mark {
    const key = `${memberId}_${eventId}`
    if (pending[key] !== undefined) return pending[key]
    return (marksMap[key]?.mark as Mark) ?? null
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const entries = Object.entries(pending).map(([key, mark]) => {
      const [memberId, eventId] = key.split('_')
      return { memberId, eventId, mark }
    })

    try {
      const res = await fetch('/api/workloads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const data = await res.json().catch(() => ({}))

      // Apply whatever the server did persist — also on partial failure, so
      // the grid reflects reality before the user retries the rest.
      if (Array.isArray(data.results)) {
        setMarksMap(prev => {
          const next = { ...prev }
          for (const r of data.results) {
            const key = `${r.memberId}_${r.eventId}`
            if (r.mark === null || !r.id) delete next[key]
            else next[key] = { id: r.id, mark: r.mark }
          }
          return next
        })
      }

      if (!res.ok) {
        setSaveError(data.error ?? 'Save failed.')
        setSaving(false)
        return
      }

      setPending({})
      setSaveSuccess(true)
      router.refresh()
    } catch {
      setSaveError('Network error — changes not saved.')
    }

    setSaving(false)
  }

  function handleDiscard() {
    setPending({})
    setSaveSuccess(false)
    setSaveError('')
  }

  return {
    marksMap,
    pending,
    hasPending,
    saving,
    saveError,
    saveSuccess,
    handleCellClick,
    getDisplayMark,
    handleSave,
    handleDiscard,
  }
}
