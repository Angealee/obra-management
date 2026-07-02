'use client'

import { useRouter } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import type { AcademicYear } from '@/types/database'
import { VIEW_YEAR_COOKIE } from '@/lib/viewYearCookie'

// System-wide academic-year selector. Sets a cookie and refreshes the route so
// every server component re-reads the chosen year. Defaults to the Active year.
export default function YearPicker({
  years,
  viewYearId,
}: {
  years: AcademicYear[]
  viewYearId: string | null
}) {
  const router = useRouter()

  function handleChange(id: string) {
    // 1-year cookie; lax so it travels with same-site navigations.
    document.cookie = `${VIEW_YEAR_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    router.refresh()
  }

  if (years.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <CalendarRange size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
        Viewing
      </span>
      <select
        value={viewYearId ?? ''}
        onChange={e => handleChange(e.target.value)}
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: '#111',
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#fff',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {years.map(y => (
          <option key={y.id} value={y.id}>
            {y.label}{y.is_active ? ' · Active' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
