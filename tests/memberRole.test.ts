import { describe, it, expect } from 'vitest'
import { memberRoleLabel, dutyTypeLabel, MEMBER_ROLE_OPTIONS } from '../lib/memberRole'

describe('memberRoleLabel', () => {
  it('maps known roles to human labels', () => {
    expect(memberRoleLabel('photographer')).toBe('Photographer')
    expect(memberRoleLabel('video_editor')).toBe('Video Editor')
    expect(memberRoleLabel('graphic_designer')).toBe('Graphic Designer')
  })

  it('falls back to "Unassigned" for null/undefined/unknown', () => {
    expect(memberRoleLabel(null)).toBe('Unassigned')
    expect(memberRoleLabel(undefined)).toBe('Unassigned')
    expect(memberRoleLabel('')).toBe('Unassigned')
    expect(memberRoleLabel('president')).toBe('Unassigned')
  })
})

describe('dutyTypeLabel', () => {
  it('reads "other" as a General Duty', () => {
    expect(dutyTypeLabel('other')).toBe('General Duty')
  })

  it('reuses the member-role label for matching duty types', () => {
    expect(dutyTypeLabel('photographer')).toBe('Photographer')
    expect(dutyTypeLabel('photo_editor')).toBe('Photo Editor')
  })

  it('falls back to "Unassigned" for unknown duty types', () => {
    expect(dutyTypeLabel('catering')).toBe('Unassigned')
  })
})

describe('MEMBER_ROLE_OPTIONS', () => {
  it('excludes the "none" sentinel (only selectable positions)', () => {
    expect(MEMBER_ROLE_OPTIONS.some(o => o.value === 'none')).toBe(false)
    expect(MEMBER_ROLE_OPTIONS).toHaveLength(6)
  })

  it('every option has a non-empty label', () => {
    for (const o of MEMBER_ROLE_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0)
    }
  })
})
