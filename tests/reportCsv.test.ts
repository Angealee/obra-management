import { describe, it, expect } from 'vitest'
import { buildCsv, toCsvValue } from '../lib/reportCsv'

describe('toCsvValue', () => {
  it('passes plain values through unquoted', () => {
    expect(toCsvValue('Juan Dela Cruz')).toBe('Juan Dela Cruz')
    expect(toCsvValue(42)).toBe('42')
    expect(toCsvValue(0)).toBe('0')
  })

  it('renders null/undefined as empty', () => {
    expect(toCsvValue(null)).toBe('')
    expect(toCsvValue(undefined)).toBe('')
  })

  it('quotes values containing commas', () => {
    expect(toCsvValue('Dela Cruz, Juan')).toBe('"Dela Cruz, Juan"')
  })

  it('escapes embedded quotes by doubling them', () => {
    expect(toCsvValue('the "big" shoot')).toBe('"the ""big"" shoot"')
  })

  it('quotes values containing newlines', () => {
    expect(toCsvValue('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildCsv', () => {
  it('joins headers + rows with CRLF', () => {
    const csv = buildCsv(['Name', 'Total'], [['Juan', 3], ['Maria', 5]])
    expect(csv).toBe('Name,Total\r\nJuan,3\r\nMaria,5')
  })

  it('survives a value that combines quotes, commas, and newlines', () => {
    const csv = buildCsv(['Note'], [['He said "go,\nnow"']])
    expect(csv).toBe('Note\r\n"He said ""go,\nnow"""')
  })

  it('produces a headers-only file for zero rows', () => {
    expect(buildCsv(['A', 'B'], [])).toBe('A,B')
  })
})
