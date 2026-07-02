import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { MemberApplication } from '@/types/database'

// Selection + keyboard navigation for the applications list. The selected
// applicant is derived from the URL, not held in state — so the list/filter
// state (which lives in the persistent layout) survives navigation between
// applicants. Extracted unchanged from ApplicationsClient.

export function useListNavigation(filtered: MemberApplication[]) {
  const router = useRouter()
  const pathname = usePathname()

  const selectedId = useMemo(() => {
    const m = pathname?.match(/\/dashboard\/applications\/([^/?#]+)/)
    return m ? m[1] : null
  }, [pathname])

  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  // Index of the keyboard-highlighted row (−1 = none; falls back to the open one).
  const [cursorIndex, setCursorIndex] = useState(-1)

  function navigate(id: string) {
    if (id === selectedId) return
    setPendingId(id)
    startTransition(() => router.push(`/dashboard/applications/${id}`))
  }

  // When a different applicant opens (by click or Enter), let the keyboard
  // cursor track it so the next ↑/↓ resumes from the open row.
  useEffect(() => { setCursorIndex(-1) }, [selectedId])

  // ↑/↓ move the highlight through the filtered list; Enter opens it.
  // Skipped while focus is in a text field so typing/search is unaffected.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (filtered.length === 0) return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return

      const current = cursorIndex >= 0 ? cursorIndex : filtered.findIndex(a => a.id === selectedId)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursorIndex(current < 0 ? 0 : Math.min(current + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursorIndex(current < 0 ? 0 : Math.max(current - 1, 0))
      } else if (e.key === 'Enter') {
        const target = current >= 0 ? filtered[current] : null
        if (target) { e.preventDefault(); navigate(target.id) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, cursorIndex, selectedId])

  // Keep the highlighted row in view as the cursor moves.
  useEffect(() => {
    if (cursorIndex < 0) return
    const el = document.querySelector(`[data-app-idx="${cursorIndex}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' })
  }, [cursorIndex])

  function backToList() {
    router.push('/dashboard/applications')
  }

  return { selectedId, isPending, pendingId, cursorIndex, navigate, backToList }
}

export type ListNavigationApi = ReturnType<typeof useListNavigation>
