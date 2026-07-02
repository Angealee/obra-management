import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Consultant bulk reject/delete over the applications list, with the
// count-then-confirm flow. Extracted unchanged from ApplicationsClient.
// (Client-side mutations — RLS is the gate; status transitions are also
// validated by the DB triggers once db/schema work lands.)

export function useBulkActions({
  userId,
  selectedId,
}: {
  userId: string
  selectedId: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<'reject' | 'delete' | null>(null)
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkError, setBulkError]         = useState<string | null>(null)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function runBulkAction() {
    if (!confirmAction || selectedIds.size === 0) return
    setBulkLoading(true)
    setBulkError(null)
    const ids = Array.from(selectedIds)

    const { error } = confirmAction === 'reject'
      ? await supabase
          .from('member_applications')
          .update({ status: 'rejected', reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .in('id', ids)
      : await supabase
          .from('member_applications')
          .delete()
          .in('id', ids)

    setBulkLoading(false)

    if (error) {
      setBulkError(`Failed to ${confirmAction} the selected applications.`)
      return
    }

    const removingSelected = confirmAction === 'delete' && selectedId !== null && ids.includes(selectedId)
    setSelectedIds(new Set())
    setConfirmAction(null)

    if (removingSelected) {
      router.push('/dashboard/applications')
    } else {
      router.refresh()
    }
  }

  return {
    selectedIds, toggleSelect,
    confirmAction, setConfirmAction,
    bulkLoading, bulkError,
    runBulkAction,
  }
}

export type BulkActionsApi = ReturnType<typeof useBulkActions>
