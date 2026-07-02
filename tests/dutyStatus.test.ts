import { describe, it, expect } from 'vitest'
import { dutyDisplayStatus, DUTY_DISPLAY_LABELS, DUTY_DISPLAY_STYLE } from '../lib/dutyStatus'

// The merged review/outcome model: a review stamps reviewed_by but leaves
// status at 'completed'. Display status must derive from BOTH fields.

describe('dutyDisplayStatus', () => {
  it('passes through pending and in_progress', () => {
    expect(dutyDisplayStatus({ status: 'pending' })).toBe('pending')
    expect(dutyDisplayStatus({ status: 'in_progress' })).toBe('in_progress')
  })

  it('completed without reviewer = awaiting_review', () => {
    expect(dutyDisplayStatus({ status: 'completed', reviewed_by: null })).toBe('awaiting_review')
    expect(dutyDisplayStatus({ status: 'completed' })).toBe('awaiting_review')
  })

  it('completed with reviewer = reviewed (the merged-review rule)', () => {
    expect(dutyDisplayStatus({ status: 'completed', reviewed_by: 'some-uuid' })).toBe('reviewed')
  })

  it('legacy status=reviewed rows still display as reviewed', () => {
    expect(dutyDisplayStatus({ status: 'reviewed', reviewed_by: null })).toBe('reviewed')
  })
})

describe('display maps cover every status', () => {
  const statuses = ['pending', 'in_progress', 'awaiting_review', 'reviewed'] as const

  it('labels', () => {
    for (const s of statuses) expect(DUTY_DISPLAY_LABELS[s]).toBeTruthy()
  })

  it('badge styles are [background, text] pairs', () => {
    for (const s of statuses) {
      expect(DUTY_DISPLAY_STYLE[s]).toHaveLength(2)
      expect(DUTY_DISPLAY_STYLE[s][0]).toMatch(/^#/)
      expect(DUTY_DISPLAY_STYLE[s][1]).toMatch(/^#/)
    }
  })
})
