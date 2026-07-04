import { describe, it, expect } from 'vitest'
import { daysFromToday, parseDateOnly, relativeDayLabel } from '../lib/relativeDate'

// Fixed "today" so tests never depend on the clock: July 4, 2026 (a Saturday).
const TODAY = new Date(2026, 6, 4, 15, 30) // time-of-day must not matter

describe('parseDateOnly', () => {
  it('builds a LOCAL date (no UTC day-shift)', () => {
    const d = parseDateOnly('2026-07-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(4)
  })

  it('tolerates a trailing time component', () => {
    expect(parseDateOnly('2026-07-04T00:00:00Z').getDate()).toBe(4)
  })
})

describe('daysFromToday', () => {
  it('is 0 for today regardless of time of day', () => {
    expect(daysFromToday('2026-07-04', TODAY)).toBe(0)
  })

  it('counts forward and backward', () => {
    expect(daysFromToday('2026-07-05', TODAY)).toBe(1)
    expect(daysFromToday('2026-07-03', TODAY)).toBe(-1)
    expect(daysFromToday('2026-07-14', TODAY)).toBe(10)
  })

  it('crosses month boundaries correctly', () => {
    expect(daysFromToday('2026-08-01', TODAY)).toBe(28)
    expect(daysFromToday('2026-06-30', TODAY)).toBe(-4)
  })
})

describe('relativeDayLabel', () => {
  it('names the near days', () => {
    expect(relativeDayLabel('2026-07-04', TODAY)).toBe('Today')
    expect(relativeDayLabel('2026-07-05', TODAY)).toBe('Tomorrow')
    expect(relativeDayLabel('2026-07-03', TODAY)).toBe('Yesterday')
  })

  it('counts nearby ranges in days', () => {
    expect(relativeDayLabel('2026-07-07', TODAY)).toBe('In 3 days')
    expect(relativeDayLabel('2026-07-01', TODAY)).toBe('3 days ago')
    expect(relativeDayLabel('2026-07-18', TODAY)).toBe('In 14 days')
  })

  it('goes quiet beyond two weeks (caller shows the plain date)', () => {
    expect(relativeDayLabel('2026-07-19', TODAY)).toBe('')
    expect(relativeDayLabel('2026-06-19', TODAY)).toBe('')
  })
})
