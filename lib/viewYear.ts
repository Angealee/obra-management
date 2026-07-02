import type { AcademicYear } from '@/types/database'

// Pure resolution of the "viewing year" — extracted from lib/academicYear.ts
// so it can be unit-tested (and imported client-side if ever needed) without
// dragging in next/headers or Supabase.
//
//   viewYear = the cookie's year (if it still exists)
//            → else the Active year
//            → else the newest year (list is ordered active-first, newest-first)
//            → else null (no years exist yet)
export function resolveViewYear(
  years: AcademicYear[],
  cookieId: string | null | undefined,
): { viewYear: AcademicYear | null; activeYear: AcademicYear | null } {
  const activeYear = years.find(y => y.is_active) ?? null
  const viewYear =
    years.find(y => y.id === cookieId) ?? activeYear ?? years[0] ?? null
  return { viewYear, activeYear }
}
