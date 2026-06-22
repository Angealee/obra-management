import { describe, it, expect } from 'vitest'
import { generateOtpCode, hashOtpCode } from '../lib/otp'

describe('generateOtpCode', () => {
  it('always returns a zero-padded 6-digit numeric string', () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateOtpCode()
      expect(code).toMatch(/^\d{6}$/)
      expect(code).toHaveLength(6)
      const n = Number(code)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(999999)
    }
  })

  it('produces varied codes (not constant)', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generateOtpCode()))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('hashOtpCode', () => {
  it('returns a 64-char lowercase hex sha256 digest', () => {
    expect(hashOtpCode('123456')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', () => {
    expect(hashOtpCode('123456')).toBe(hashOtpCode('123456'))
  })

  it('differs for different codes', () => {
    expect(hashOtpCode('123456')).not.toBe(hashOtpCode('654321'))
  })

  it('never returns the plaintext code', () => {
    expect(hashOtpCode('123456')).not.toContain('123456')
  })
})
