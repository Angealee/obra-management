import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fireNotification } from '@/lib/notifyClient'
import type { Mark, MarksMap, Matrix, PendingMap } from './matrixTypes'

// The mutation heart of the workload matrix: local mark state, the
// click-to-cycle interaction, and persistence (save/discard). Extracted
// unchanged from WorkLoadMatrix so the view components stay presentation-only.

const CYCLE: Mark[] = ['completed', 'late', 'did_not_duty', null]

export function useWorkloadMarks({
  matrix,
  initialMarksMap,
}: {
  matrix: Matrix
  initialMarksMap: MarksMap
}) {
  const router = useRouter()
  const supabase = createClient()

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveError('Not authenticated.'); setSaving(false); return }

    const errors: string[] = []
    const uid = user.id
    const nowIso = new Date().toISOString()

    // Keep the matching duty record in sync with the mark recorded here, so
    // marking an outcome in the matrix behaves exactly like "Mark Outcome" on
    // the duty detail page (DutyActions). Recording an outcome stamps the duty
    // as reviewed (status='completed' + reviewed_by/reviewed_at); clearing a
    // mark reverts that review. Matrix-only cells (no duty) are left untouched.
    // Without this, the matrix and the Duties list drift apart — a cell marked
    // completed here would otherwise leave its duty stuck on "pending".
    async function syncDuties(memberId: string, eventId: string, reviewed: boolean) {
      const cellDuties = matrix[memberId]?.[eventId] ?? []
      for (const d of cellDuties) {
        const upd: Record<string, any> = reviewed
          ? { status: 'completed', reviewed_by: uid, reviewed_at: nowIso }
          : { reviewed_by: null, reviewed_at: null, remarks: null }
        // Stamp completion time only on the transition into completed.
        if (reviewed && d.status !== 'completed' && d.status !== 'reviewed') {
          upd.completed_at = nowIso
        }
        // Demote legacy status='reviewed' back to 'completed' when un-reviewing.
        if (!reviewed && d.status === 'reviewed') upd.status = 'completed'
        const { error } = await supabase.from('duties').update(upd).eq('id', d.id)
        if (error) errors.push(error.message)
      }
    }

    for (const [key, newMark] of Object.entries(pending)) {
      const [memberId, eventId] = key.split('_')
      const existing = marksMap[key]

      if (newMark === null) {
        // Delete the mark + revert the matching duty's review state.
        if (existing?.id) {
          const { error } = await supabase
            .from('workload_marks')
            .delete()
            .eq('id', existing.id)
          if (error) errors.push(error.message)
          else {
            setMarksMap(prev => { const n = { ...prev }; delete n[key]; return n })
            await syncDuties(memberId, eventId, false)
          }
        }
      } else if (existing?.id) {
        // Update the mark + stamp the matching duty as reviewed.
        const { error } = await supabase
          .from('workload_marks')
          .update({ mark: newMark, marked_by: uid })
          .eq('id', existing.id)
        if (error) errors.push(error.message)
        else {
          setMarksMap(prev => ({ ...prev, [key]: { id: existing.id, mark: newMark } }))
          await syncDuties(memberId, eventId, true)
        }
      } else {
        // Insert the mark + stamp the matching duty as reviewed.
        const { data, error } = await supabase
          .from('workload_marks')
          .insert({ member_id: memberId, event_id: eventId, mark: newMark, marked_by: uid })
          .select()
          .single()
        if (error) errors.push(error.message)
        else if (data) {
          setMarksMap(prev => ({ ...prev, [key]: { id: data.id, mark: newMark } }))
          await syncDuties(memberId, eventId, true)
        }
      }
    }

    if (errors.length > 0) {
      setSaveError(`Some changes failed: ${errors[0]}`)
    } else {
      // Push "your outcome was recorded" to the marked members. Cleared marks
      // (null) don't notify. The server re-verifies each entry against the
      // workload_marks rows this user actually wrote.
      const entries = Object.entries(pending)
        .filter(([, mark]) => mark !== null)
        .map(([key]) => {
          const [memberId, eventId] = key.split('_')
          return { memberId, eventId }
        })
      if (entries.length > 0) fireNotification('workload_marked', { entries })

      setPending({})
      setSaveSuccess(true)
      router.refresh()
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
