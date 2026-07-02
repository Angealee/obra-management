import { describe, it, expect } from 'vitest'
import { resolveViewYear } from '../lib/viewYear'
import type { AcademicYear } from '../types/database'

function year(id: string, opts: Partial<AcademicYear> = {}): AcademicYear {
  return {
    id,
    label: `A.Y. ${id}`,
    start_date: '2026-08-01',
    end_date: '2027-05-31',
    is_active: false,
    created_at: '2026-01-01T00:00:00Z',
    ...opts,
  }
}

// List arrives ordered active-first then newest-first (lib/academicYear.ts).
const y2027 = year('2027', { is_active: false })
const y2026 = year('2026', { is_active: true })
const y2025 = year('2025', { is_active: false })

describe('resolveViewYear', () => {
  it('uses the cookie year when it still exists', () => {
    const { viewYear, activeYear } = resolveViewYear([y2026, y2027, y2025], '2025')
    expect(viewYear?.id).toBe('2025')
    expect(activeYear?.id).toBe('2026')
  })

  it('falls back to the active year when the cookie is missing', () => {
    expect(resolveViewYear([y2026, y2027, y2025], undefined).viewYear?.id).toBe('2026')
    expect(resolveViewYear([y2026, y2027, y2025], null).viewYear?.id).toBe('2026')
  })

  it('falls back to the active year when the cookie points at a deleted year', () => {
    expect(resolveViewYear([y2026, y2025], 'deleted-id').viewYear?.id).toBe('2026')
  })

  it('falls back to the first (newest) year when no year is active', () => {
    const { viewYear, activeYear } = resolveViewYear([y2027, y2025], undefined)
    expect(viewYear?.id).toBe('2027')
    expect(activeYear).toBeNull()
  })

  it('returns nulls when no years exist yet', () => {
    expect(resolveViewYear([], undefined)).toEqual({ viewYear: null, activeYear: null })
  })
})
