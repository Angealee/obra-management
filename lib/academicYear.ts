import { cookies } from 'next/headers'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { AcademicYear } from '@/types/database'
import { VIEW_YEAR_COOKIE } from '@/lib/viewYearCookie'
import { resolveViewYear } from '@/lib/viewYear'

// Resolves the academic year currently "in view" for the request.
//
//   viewYear = the cookie's year (if it still exists)
//            → else the Active year
//            → else the newest year
//            → else null (no years exist yet)
//
// Wrapped in React cache() so multiple callers in one render (layout + page)
// share a single DB round-trip.
export const getAcademicYearContext = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('academic_years')
    .select('*')
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false }) as { data: AcademicYear[] | null }

  const years = data ?? []

  const cookieStore = await cookies()
  const cookieId = cookieStore.get(VIEW_YEAR_COOKIE)?.value

  // Pure fallback chain lives in lib/viewYear.ts (unit-tested).
  const { viewYear, activeYear } = resolveViewYear(years, cookieId)

  return {
    years,
    viewYear,
    viewYearId: viewYear?.id ?? null,
    activeYear,
  }
})
