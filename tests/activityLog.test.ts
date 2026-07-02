import { describe, it, expect } from 'vitest'
import { buildDiff, REDACTED_FIELDS } from '../lib/activityLog'

// buildDiff must mirror the DB trigger's diff shape so API-route log entries
// and trigger entries render identically in the activity feed.

describe('buildDiff', () => {
  it('excludes unchanged fields', () => {
    const diff = buildDiff(
      { full_name: 'Juan', year_level: '2nd Year' },
      { full_name: 'Juan', year_level: '3rd Year' },
    )
    expect(Object.keys(diff)).toEqual(['year_level'])
  })

  it('records old → new values for plain fields', () => {
    const diff = buildDiff({ member_role: 'none' }, { member_role: 'photographer' })
    expect(diff.member_role).toEqual({ old: 'none', new: 'photographer' })
  })

  it('redacts sensitive fields to a bare changed marker (never values)', () => {
    const diff = buildDiff(
      { email: 'old@dct.edu.ph', contact_number: '09170000000' },
      { email: 'new@dct.edu.ph', contact_number: '09171111111' },
    )
    expect(diff.email).toEqual({ changed: true })
    expect(diff.contact_number).toEqual({ changed: true })
    expect(JSON.stringify(diff)).not.toContain('dct.edu.ph')
    expect(JSON.stringify(diff)).not.toContain('0917')
  })

  it('the redaction list covers the fields the member-update route diffs', () => {
    for (const f of ['email', 'contact_number', 'student_number', 'password']) {
      expect(REDACTED_FIELDS.has(f)).toBe(true)
    }
  })

  it('renders null-ish sides as an em dash', () => {
    const diff = buildDiff({ username: null }, { username: 'juan_dc' })
    expect(diff.username).toEqual({ old: '—', new: 'juan_dc' })
  })

  it('treats null and empty string as equal (no noise entries)', () => {
    expect(buildDiff({ username: null }, { username: '' })).toEqual({})
  })

  it('truncates long values to 120 chars', () => {
    const long = 'x'.repeat(500)
    const diff = buildDiff({ course_section: 'a' }, { course_section: long })
    expect((diff.course_section.new ?? '').length).toBe(120)
  })
})
